'use client'

import { useRef, useState } from 'react'
import { BarChart3, Plus, Trash2, Pencil, LineChart, ScanLine, Sparkles, FolderPlus, ArrowRightLeft, UploadCloud, Repeat, Target, Download } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import ModuleGate from '@/components/ModuleGate'
import SavingsGoalsCard from '@/components/SavingsGoalsCard'
import FixedCostsCard from '@/components/FixedCostsCard'
import IncomeCard from '@/components/IncomeCard'
import LoansCard from '@/components/LoansCard'
import SubscriptionsCard from '@/components/SubscriptionsCard'
import SpendingExplorer from '@/components/budget/SpendingExplorer'
import BudgetImport from '@/components/BudgetImport'
import OverigCleanup from '@/components/OverigCleanup'
import { useBudget, useSettings, useFixedCosts, useSubscriptions, useHousehold, useIncome, useLoans } from '@/lib/hooks'
import { apiPost } from '@/lib/api'
import { resolveIcon } from '@/lib/icons'
import {
  cleanLabel,
  fixedCostMonthly,
  isSpendingCategory,
  merchantKey,
  monthlyEquivalent,
  periodKeyOf,
  periodRangeOf,
} from '@/lib/budget'
import BudgetProgressCard from '@/components/budget/BudgetProgressCard'
import AutoCategorizeSteps from '@/components/budget/AutoCategorizeSteps'
import InsightsCard from '@/components/budget/InsightsCard'
import CategoryDayPotsCard from '@/components/budget/CategoryDayPotsCard'
import UpcomingPaymentsCard from '@/components/budget/UpcomingPaymentsCard'
import QuickActions, { type QuickAction } from '@/components/budget/QuickActions'
import GezinsbudgetCard from '@/components/budget/GezinsbudgetCard'
import RecurringSuggestions from '@/components/budget/RecurringSuggestions'
import type { BudgetCategory } from '@/lib/types'

const colorClasses: Record<string, { bar: string; iconBg: string; iconText: string }> = {
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  violet: { bar: 'bg-violet-500', iconBg: 'bg-violet-100', iconText: 'text-violet-600' },
  amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
  sky: { bar: 'bg-sky-500', iconBg: 'bg-sky-100', iconText: 'text-sky-600' },
}
const COLOR_OPTIONS = ['emerald', 'violet', 'amber', 'sky'] as const

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Verklein een foto en geef een JPEG data-URL (scherp genoeg om te lezen). */
function downscaleImage(file: File, max = 1500): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas niet beschikbaar'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => reject(new Error('Afbeelding kon niet worden geladen'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Bestand kon niet worden gelezen'))
    reader.readAsDataURL(file)
  })
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Bestand kon niet worden gelezen'))
    reader.readAsDataURL(file)
  })
}

/** Foto's worden verkleind; PDF's (facturen) gaan ongewijzigd mee. */
function fileToDataUrl(file: File): Promise<string> {
  return file.type === 'application/pdf' ? readAsDataUrl(file) : downscaleImage(file)
}

interface ScanItem {
  name: string
  price: number
}

export default function BudgetPage() {
  const {
    categories,
    transactions,
    isLoading,
    addTransaction,
    removeTransaction,
    updateCategory,
    addCategory,
    removeCategory,
    assignMerchant,
    mergeCategory,
  } = useBudget()
  const { settings } = useSettings()
  const { costs } = useFixedCosts()
  const { subscriptions } = useSubscriptions()
  const { incomes } = useIncome()
  const { loans } = useLoans()
  const { can } = useHousehold()
  const target = typeof settings.budgetTarget === 'number' ? settings.budgetTarget : 500
  // Startdag van de budgetperiode (1 = kalendermaand). Bijv. 25 = van de 25e t/m de 24e.
  const periodStart =
    typeof settings.budgetPeriodStart === 'number' && settings.budgetPeriodStart >= 1 && settings.budgetPeriodStart <= 28
      ? settings.budgetPeriodStart
      : 1
  const periodWord = periodStart > 1 ? 'periode' : 'maand'
  const periodPlural = periodStart > 1 ? 'periodes' : 'maanden'

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ label: '', category: '', amount: '', note: '', paymentMethod: '' })
  const [showAllCats, setShowAllCats] = useState(false)
  const [tab, setTab] = useState<'overzicht' | 'uitgaven' | 'plannen' | 'importeren'>('overzicht')
  const currentMonthLabel = (() => {
    const f = new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    return f.charAt(0).toUpperCase() + f.slice(1)
  })()

  // Bon/factuur scannen
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<{ items: ScanItem[]; advice: string } | null>(null)

  const openAdd = () => {
    setForm({ label: '', category: '', amount: '', note: '', paymentMethod: '' })
    setScanResult(null)
    setScanError(null)
    setOpen(true)
  }

  const onScan = async (file: File | undefined) => {
    if (!file) return
    setScanError(null)
    setScanResult(null)
    setScanBusy(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const res = (await apiPost('/api/budget/scan', { file: dataUrl })) as {
        merchant: string
        date: string
        total: number
        category: string
        items: ScanItem[]
        advice: string
      }
      setForm((f) => ({
        ...f,
        label: res.merchant || 'Bon',
        category: res.category || categories[0]?.name || '',
        amount: res.total ? String(res.total.toFixed(2)).replace('.', ',') : '',
      }))
      setScanResult({ items: res.items ?? [], advice: res.advice ?? '' })
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Scannen mislukt.')
    } finally {
      setScanBusy(false)
      if (cameraRef.current) cameraRef.current.value = ''
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Categorie-limiet bewerken
  const [editCat, setEditCat] = useState<BudgetCategory | null>(null)
  const [limitDraft, setLimitDraft] = useState('')
  const openEdit = (cat: BudgetCategory) => {
    setEditCat(cat)
    setLimitDraft(String(Math.round(cat.limit)))
  }
  const saveLimit = async (e: React.FormEvent) => {
    e.preventDefault()
    const lim = Number(limitDraft.replace(',', '.'))
    if (editCat && lim >= 0) await updateCategory(editCat.id, { limit: lim })
    setEditCat(null)
  }

  // Nieuwe categorie toevoegen
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', color: 'emerald', limit: '' })
  const submitNewCat = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newCat.name.trim()
    if (!name) return
    const limit = Number(newCat.limit.replace(',', '.')) || 0
    await addCategory({ name, color: newCat.color, limit })
    setNewCat({ name: '', color: 'emerald', limit: '' })
    setAddCatOpen(false)
  }

  // Categorie beheren: kleur/limiet bijwerken, transacties (per winkel) verplaatsen,
  // of de categorie verwijderen (transacties gaan dan terug naar 'Overig').
  const [manageCat, setManageCat] = useState<BudgetCategory | null>(null)
  const [mDraft, setMDraft] = useState({ color: 'emerald', limit: '' })
  const [merging, setMerging] = useState(false)
  const openManage = (cat: BudgetCategory) => {
    setManageCat(cat)
    setMDraft({ color: cat.color || 'emerald', limit: String(Math.round(cat.limit)) })
  }
  const saveManage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manageCat) return
    const limit = Number(mDraft.limit.replace(',', '.')) || 0
    await updateCategory(manageCat.id, { color: mDraft.color, limit })
    setManageCat(null)
  }
  const deleteManaged = async () => {
    if (!manageCat) return
    await removeCategory(manageCat.id)
    setManageCat(null)
  }
  const moveGroup = (pattern: string, toCategory: string) => assignMerchant(pattern, toCategory)

  // Gemiddelde uitgave per maand per categorie (uit de historie). Hierop baseren
  // we "Per categorie", het maandtotaal én de prognose — niet op het 'spent'-veld
  // (dat blijft 0 bij import en gaf lege balken).
  const spendingTx = transactions.filter((t) => isSpendingCategory(t.category) && (Number(t.amount) || 0) > 0)
  const spendMonths = new Set<string>()
  const sumByCat = new Map<string, number>()
  for (const t of spendingTx) {
    const pk = periodKeyOf(t.date, periodStart)
    if (pk) spendMonths.add(pk)
    const k = t.category || 'Overig'
    sumByCat.set(k, (sumByCat.get(k) ?? 0) + (Number(t.amount) || 0))
  }
  const monthsCount = Math.max(1, spendMonths.size)
  const avgByCat = new Map<string, number>()
  for (const [k, v] of sumByCat) avgByCat.set(k, v / monthsCount)
  const recent = spendingTx.slice(0, 40)

  // Huidige periode (deze maand/pay-cycle): actuele uitgaven per categorie + totaal,
  // en een prognose voor het einde van de periode (al uitgegeven + gemiddeld tempo
  // over het resterende deel).
  const now = new Date()
  const periodNow = periodRangeOf(now, periodStart)
  // currentKey via dezelfde helper als de transactie-bucketing (jaarwissel-veilig).
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const currentKey = periodKeyOf(nowStr, periodStart) ?? ''
  const currentByCat = new Map<string, number>()
  let currentSpent = 0
  for (const t of spendingTx) {
    if (periodKeyOf(t.date, periodStart) !== currentKey) continue
    const a = Number(t.amount) || 0
    currentByCat.set(t.category || 'Overig', (currentByCat.get(t.category || 'Overig') ?? 0) + a)
    currentSpent += a
  }
  const curOf = (name: string) => currentByCat.get(name) ?? 0
  const MS_DAY = 86400000
  const daysTotal = Math.max(1, Math.round((periodNow.end.getTime() - periodNow.start.getTime()) / MS_DAY) + 1)
  const daysElapsed = Math.min(daysTotal, Math.max(1, Math.round((now.getTime() - periodNow.start.getTime()) / MS_DAY) + 1))
  const fraction = daysElapsed / daysTotal
  const avgTotalAll = [...avgByCat.values()].reduce((s, v) => s + v, 0)
  const projected = currentSpent + Math.max(0, avgTotalAll * (1 - fraction))

  // Alleen echte uitgaven-categorieën (geen Inkomsten/Negeren), en lege verbergen.
  const spendingCats = categories.filter((c) => isSpendingCategory(c.name))
  const nonEmptyCats = spendingCats.filter((c) => c.limit > 0 || curOf(c.name) > 0)
  const visibleCats = showAllCats ? spendingCats : nonEmptyCats.length ? nonEmptyCats : spendingCats.slice(0, 6)
  const hiddenCount = spendingCats.length - visibleCats.length

  const totalLimit = Math.round(spendingCats.reduce((sum, c) => sum + c.limit, 0))
  // Geen categorie-limieten ingesteld? Val terug op de maandtarget als referentie.
  const hasLimits = totalLimit > 0
  const budgetRef = hasLimits ? totalLimit : target

  // Aflossingen/schulden apart van vaste lasten houden (hypotheek + leningen).
  const isAflossing = (cat?: string) => /afloss|lening|hypothe|schuld|krediet/i.test(cat || '')
  const fixedTotal = costs.filter((c) => !isAflossing(c.category)).reduce((sum, c) => sum + fixedCostMonthly(c), 0)
  const fixedAflossing = costs.filter((c) => isAflossing(c.category)).reduce((sum, c) => sum + fixedCostMonthly(c), 0)
  const loanMonthly = loans.reduce((sum, l) => sum + (l.termAmount || 0), 0)
  const aflossingenMonthly = loanMonthly + fixedAflossing

  // Maandbegroting: inkomsten − vaste lasten − abonnementen − aflossingen − variabel.
  const subsMonthly = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.interval), 0)
  const incomeMonthly = incomes.reduce((sum, i) => sum + monthlyEquivalent(i.amount, i.interval), 0)

  // Verwachte variabele kosten per categorie (zónder vaste lasten/aflossingen) → prognose.
  const NON_VARIABLE_CATS = new Set(['Vaste lasten', 'Aflossingen'])
  const variableForecast = [...avgByCat.entries()]
    .filter(([k]) => !NON_VARIABLE_CATS.has(k))
    .sort((a, b) => b[1] - a[1])
  const variableAvg = variableForecast.reduce((s, [, v]) => s + v, 0)
  const nextMonthNet = incomeMonthly - fixedTotal - subsMonthly - aflossingenMonthly - variableAvg

  // Vaste lasten gegroepeerd per categorie (zonder aflossingen — die staan apart).
  const costsByCategory = Object.entries(
    costs
      .filter((c) => !isAflossing(c.category))
      .reduce<Record<string, number>>((acc, c) => {
        const key = c.category || 'Overig'
        acc[key] = (acc[key] ?? 0) + fixedCostMonthly(c)
        return acc
      }, {}),
  ).sort((a, b) => b[1] - a[1])

  // Transacties van de te beheren categorie, gegroepeerd per winkel — zodat je een
  // hele winkel in één keer naar een andere categorie kunt verplaatsen (onthouden).
  const manageGroups = (() => {
    if (!manageCat) return [] as { key: string; example: string; total: number; count: number }[]
    const m = new Map<string, { key: string; example: string; total: number; count: number }>()
    for (const t of transactions) {
      if ((t.category || 'Overig') !== manageCat.name) continue
      const amt = Number(t.amount) || 0
      if (amt <= 0) continue
      const key = merchantKey(t.label) || (t.label || 'onbekend').toLowerCase().slice(0, 32)
      const g = m.get(key) ?? { key, example: t.label, total: 0, count: 0 }
      g.total += amt
      g.count += 1
      m.set(key, g)
    }
    return [...m.values()].sort((a, b) => b.total - a.total)
  })()
  const moveTargets = manageCat
    ? spendingCats.map((c) => c.name).filter((n) => n !== manageCat.name)
    : []

  const goTab = (t: typeof tab) => {
    setTab(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const exportCsv = () => {
    const rows = [
      ['Datum', 'Omschrijving', 'Categorie', 'Bedrag'],
      ...transactions.map((t) => [t.date, t.label, t.category, String(t.amount)]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`).join(','))
      .join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budget-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  const quickActions: QuickAction[] = [
    { icon: Plus, label: 'Nieuwe uitgave', onClick: openAdd },
    { icon: UploadCloud, label: 'Bestand uploaden', onClick: () => goTab('importeren') },
    { icon: Repeat, label: 'Abonnement', onClick: () => goTab('plannen') },
    { icon: Target, label: 'Spaardoel', onClick: () => goTab('plannen') },
    { icon: Download, label: 'Rapport (CSV)', onClick: exportCsv },
  ]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount.replace(',', '.'))
    if (!form.label.trim() || !amount) return
    await addTransaction({
      label: form.label,
      category: form.category || categories[0]?.name || 'Overig',
      amount,
      note: form.note.trim() || null,
      paymentMethod: form.paymentMethod || null,
    })
    setForm({ label: '', category: '', amount: '', note: '', paymentMethod: '' })
    setOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Budget"
        subtitle={currentMonthLabel}
        icon={BarChart3}
        iconClassName="bg-brand-light text-brand"
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Uitgave toevoegen
          </button>
        }
      />

      {/* Tab-navigatie: houdt de pagina kort — elke tab toont één taakgebied. */}
      <div className="mb-5 flex gap-1 rounded-2xl bg-slate-100 p-1">
        {(
          [
            ['overzicht', 'Overzicht'],
            ['uitgaven', 'Uitgaven'],
            ['plannen', 'Plannen'],
            ['importeren', 'Importeren'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-xl px-2 py-2 text-sm font-semibold transition-colors ${
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        {tab === 'overzicht' && (
        <>
        {/* Budgetvoortgang — gauge van deze periode */}
        <BudgetProgressCard spent={currentSpent} budget={budgetRef} projected={projected} periodWord={periodWord} />

        {/* Categories */}
        <DashboardCard
          title="Uitgaven per categorie"
          headerRight={
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                {periodWord === 'periode' ? 'Deze periode' : 'Deze maand'}
              </span>
              <button
                type="button"
                onClick={() => setAddCatOpen(true)}
                className="pill bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/15"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Categorie
              </button>
            </div>
          }
        >
          <ul className="flex flex-col gap-4">
            {visibleCats.map((cat) => {
              const colors = colorClasses[cat.color] ?? colorClasses.emerald
              const spent = curOf(cat.name)
              const pct = currentSpent > 0 ? (spent / currentSpent) * 100 : 0
              const Icon = resolveIcon(cat.icon)
              return (
                <li key={cat.id} className="group">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => openManage(cat)}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${colors.iconBg} ${colors.iconText}`}
                      aria-label={`${cat.name} beheren`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openManage(cat)}
                      className="flex-1 truncate text-left text-sm font-semibold text-slate-700 hover:text-brand"
                    >
                      {cat.name}
                    </button>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                        €{Math.round(spent)}
                      </span>
                      <span className="block text-[11px] text-slate-400">{Math.round(pct)}%</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      aria-label={`Limiet ${cat.name} aanpassen`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                      style={{ width: `${Math.max(spent > 0 ? 4 : 0, pct)}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
          {(hiddenCount > 0 || showAllCats) && (
            <button
              type="button"
              onClick={() => setShowAllCats((s) => !s)}
              className="mt-3 text-sm font-semibold text-brand hover:underline"
            >
              {showAllCats ? 'Minder tonen' : `Toon alle categorieën (${spendingCats.length})`}
            </button>
          )}
        </DashboardCard>

        {/* Dagpotjes: categorielimiet → dagbudget met rollover */}
        <CategoryDayPotsCard />

        {/* Inzichten + coach (samengevoegd): deze vs vorige periode, prognose, besparingen */}
        <InsightsCard
          transactions={transactions}
          periodStart={periodStart}
          budget={budgetRef}
          projected={projected}
          avgByCat={avgByCat}
        />

        {/* Snelle acties */}
        <QuickActions actions={quickActions} />
        </>
        )}

        {tab === 'plannen' && (
        <>
        {/* Budgetplanner-module: begroting, inkomsten, vaste lasten, spaardoelen */}
        <div className="lg:col-span-2">
        <ModuleGate module="budgetplanner">
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        {/* Maandbegroting (full width) — één overzicht: inkomsten − lasten = over */}
        <DashboardCard title="Maandbegroting" icon={LineChart} iconClassName="text-violet-500" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            {[
              { label: 'Inkomsten', value: incomeMonthly, tone: 'pos' as const },
              { label: 'Vaste lasten', value: -fixedTotal, tone: 'default' as const },
              { label: 'Abonnementen', value: -subsMonthly, tone: 'default' as const },
              { label: 'Aflossingen', value: -aflossingenMonthly, tone: 'default' as const },
              { label: 'Variabele uitgaven', value: -variableAvg, tone: 'default' as const },
              { label: 'Over per maand', value: nextMonthNet, tone: nextMonthNet >= 0 ? ('pos' as const) : ('neg' as const) },
            ].map((item) => {
              const box =
                item.tone === 'pos' ? 'bg-emerald-500/10' : item.tone === 'neg' ? 'bg-rose-500/10' : 'bg-slate-100'
              const txt =
                item.tone === 'pos'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : item.tone === 'neg'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-slate-100'
              const sign = item.value < 0 ? '−' : item.tone === 'pos' ? '+' : ''
              return (
                <div key={item.label} className={`rounded-2xl p-3 sm:p-4 ${box}`}>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className={`text-base font-extrabold sm:text-lg ${txt}`}>
                    {sign}€{euro(Math.abs(item.value))}
                  </p>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Over per maand = inkomsten − vaste lasten − abonnementen − aflossingen − je gemiddelde variabele
            uitgaven
            {spendMonths.size > 0 ? ` (over ${spendMonths.size} ${spendMonths.size === 1 ? periodWord : periodPlural})` : ''}
            . Eenmalige posten tellen niet mee.
            {totalLimit > 0 ? ` Je budget voor variabele uitgaven is €${totalLimit}.` : ''}
          </p>

          {costsByCategory.length > 0 && (
            <div className="mt-4 border-t border-cardborder pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Vaste lasten per categorie
              </p>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {costsByCategory.map(([cat, sum]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-600">{cat}</span>
                    <span className="shrink-0 font-semibold text-slate-800">€{euro(sum)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {variableForecast.length > 0 && (
            <div className="mt-4 border-t border-cardborder pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Variabele uitgaven per categorie (gem. €{Math.round(variableAvg)} p/m)
              </p>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {variableForecast.slice(0, 9).map(([cat, v]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate text-slate-600">{cat}</span>
                    <span className="shrink-0 font-semibold text-slate-800">€{euro(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DashboardCard>

        {/* Inkomsten, vaste lasten, abonnementen, leningen, spaardoelen */}
        <IncomeCard />
        <FixedCostsCard />
        <SubscriptionsCard />
        <LoansCard />
        <SavingsGoalsCard />
        <GezinsbudgetCard />
        <UpcomingPaymentsCard costs={costs} />
        </div>
        </ModuleGate>
        </div>
        </>
        )}

        {tab === 'uitgaven' && (
        <>
        {/* Uitgaven: periode-presets + klikbare trend + verdeling + transacties */}
        <SpendingExplorer transactions={transactions} periodStart={periodStart} />

        {/* Recent transactions (full width) */}
        <DashboardCard title="Recente uitgaven" className="lg:col-span-2">
          {isLoading && transactions.length === 0 ? (
            <p className="text-sm text-slate-400">Laden…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen uitgaven geregistreerd.</p>
          ) : (
            <ul className="flex flex-col">
              {recent.map((tx, index) => (
                <li key={tx.id}>
                  <div className="group flex items-center gap-3 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                      {cleanLabel(tx.label).charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800" title={tx.label}>
                        {cleanLabel(tx.label)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {tx.category} · {tx.date}
                        {tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                        {tx.note ? ` · ${tx.note}` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-800">€{euro(tx.amount)}</p>
                    <button
                      type="button"
                      onClick={() => removeTransaction(tx.id)}
                      aria-label={`${tx.label} verwijderen`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {index < recent.length - 1 && <hr className="border-cardborder" />}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
        </>
        )}

        {tab === 'importeren' && (
        <>
        {/* Bestanden uploaden (premium uploadcentrum) */}
        <BudgetImport />

        {/* Slim gedetecteerde terugkerende afschrijvingen (incasso's) */}
        <RecurringSuggestions />

        {/* Hoe automatische categorisatie werkt */}
        <AutoCategorizeSteps />

        {/* Budget opschonen / categoriseren (met geheugen + AI) */}
        <OverigCleanup />
        </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Uitgave toevoegen">
        <form onSubmit={submit} className="flex flex-col gap-3">
          {can('budgetplanner') && (
            <div className="rounded-2xl bg-slate-50 p-3">
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onScan(e.target.files?.[0])}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => onScan(e.target.files?.[0])}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  disabled={scanBusy}
                  className="pill flex-1 justify-center bg-white px-3 py-2.5 text-sm font-semibold text-brand ring-1 ring-brand/30 hover:bg-brand-light disabled:opacity-50"
                >
                  <ScanLine className={`h-4 w-4 ${scanBusy ? 'animate-pulse' : ''}`} />
                  Scan bon
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={scanBusy}
                  className="pill flex-1 justify-center bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-cardborder hover:bg-slate-100 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Upload factuur
                </button>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-slate-400">
                {scanBusy ? 'Bon/factuur uitlezen…' : 'Foto of PDF — de AI vult bedrag en categorie vast in.'}
              </p>
              {scanError && <p className="mt-2 text-xs font-medium text-rose-600">{scanError}</p>}
            </div>
          )}

          <label className="text-xs font-semibold text-slate-500">
            Omschrijving
            <input
              autoFocus
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Bijv. Albert Heijn"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Categorie
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-32 text-xs font-semibold text-slate-500">
              Bedrag (€)
              <input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <div className="flex gap-3">
            <label className="w-40 text-xs font-semibold text-slate-500">
              Betaalmethode
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                <option value="">—</option>
                <option value="pin">Pin</option>
                <option value="creditcard">Creditcard</option>
                <option value="contant">Contant</option>
                <option value="incasso">Incasso</option>
                <option value="overboeking">Overboeking</option>
              </select>
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Notitie (optioneel)
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Bijv. verjaardagscadeau"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>

          {scanResult && (
            <div className="rounded-2xl border border-brand/20 bg-brand-light/40 p-3">
              {scanResult.advice && (
                <p className="mb-2 flex items-start gap-1.5 text-xs text-slate-700">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  {scanResult.advice}
                </p>
              )}
              {scanResult.items.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Gekochte posten
                  </p>
                  <ul className="mt-1 max-h-40 overflow-y-auto pr-1 text-xs text-slate-600">
                    {scanResult.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-2 py-0.5">
                        <span className="truncate">{it.name}</span>
                        <span className="shrink-0 text-slate-500">€{euro(it.price)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Uitgave opslaan
          </button>
        </form>
      </Modal>

      <Modal open={!!editCat} onClose={() => setEditCat(null)} title={editCat ? `Limiet ${editCat.name}` : ''}>
        <form onSubmit={saveLimit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Maandlimiet (€)
            <input
              autoFocus
              inputMode="decimal"
              value={limitDraft}
              onChange={(e) => setLimitDraft(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Limiet opslaan
          </button>
        </form>
      </Modal>

      {/* Nieuwe categorie */}
      <Modal open={addCatOpen} onClose={() => setAddCatOpen(false)} title="Nieuwe categorie">
        <form onSubmit={submitNewCat} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Naam
            <input
              autoFocus
              value={newCat.name}
              onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              placeholder="Bijv. Kleding"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Kleur</p>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewCat({ ...newCat, color: c })}
                  aria-label={c}
                  className={`h-8 w-8 rounded-full ${colorClasses[c].bar} ${
                    newCat.color === c ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                  }`}
                />
              ))}
            </div>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            Maandlimiet (€) — optioneel
            <input
              inputMode="decimal"
              value={newCat.limit}
              onChange={(e) => setNewCat({ ...newCat, limit: e.target.value })}
              placeholder="0"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Categorie opslaan
          </button>
        </form>
      </Modal>

      {/* Categorie beheren: kleur/limiet + transacties verplaatsen + verwijderen */}
      <Modal
        open={!!manageCat}
        onClose={() => setManageCat(null)}
        title={manageCat ? `${manageCat.name} beheren` : ''}
      >
        {manageCat && (
          <div className="flex flex-col gap-4">
            <form onSubmit={saveManage} className="flex flex-col gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">Kleur</p>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setMDraft({ ...mDraft, color: c })}
                      aria-label={c}
                      className={`h-8 w-8 rounded-full ${colorClasses[c].bar} ${
                        mDraft.color === c ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
              <label className="text-xs font-semibold text-slate-500">
                Maandlimiet (€)
                <input
                  inputMode="decimal"
                  value={mDraft.limit}
                  onChange={(e) => setMDraft({ ...mDraft, limit: e.target.value })}
                  className={`mt-1 ${inputClass}`}
                />
              </label>
              <button
                type="submit"
                className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
              >
                Opslaan
              </button>
            </form>

            <div className="border-t border-cardborder pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Transacties verplaatsen ({manageGroups.length} winkels)
              </p>
              {manageGroups.length === 0 ? (
                <p className="text-sm text-slate-500">Nog geen transacties in deze categorie.</p>
              ) : (
                <ul className="flex max-h-72 flex-col divide-y divide-cardborder overflow-y-auto pr-1">
                  {manageGroups.map((g) => (
                    <li key={g.key} className="flex items-center gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800" title={g.example}>
                          {cleanLabel(g.example)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          €{euro(g.total)} · {g.count}×
                        </p>
                      </div>
                      <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const value = e.target.value
                          e.target.value = '' // reset naar placeholder na verplaatsen
                          if (value) moveGroup(g.key, value)
                        }}
                        className="shrink-0 rounded-lg border border-cardborder bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                      >
                        <option value="">Verplaats naar…</option>
                        {moveTargets.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] text-slate-400">
                Verplaatsen onthoudt de winkel — volgende imports volgen automatisch.
              </p>
            </div>

            <div className="border-t border-cardborder pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Samenvoegen met een andere categorie
              </p>
              <select
                defaultValue=""
                disabled={merging}
                onChange={async (e) => {
                  const intoId = Number(e.target.value)
                  e.target.value = ''
                  if (!intoId || !manageCat || merging) return
                  if (!window.confirm(`"${manageCat.name}" samenvoegen? Alle transacties en regels gaan mee en de categorie verdwijnt.`)) return
                  setMerging(true)
                  try {
                    await mergeCategory(manageCat.id, intoId)
                    setManageCat(null)
                  } finally {
                    setMerging(false)
                  }
                }}
                className={inputClass}
              >
                <option value="">— kies doelcategorie —</option>
                {spendingCats
                  .filter((c) => c.id !== manageCat.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Transacties, geleerde regels en de limiet gaan over naar de doelcategorie.
              </p>
            </div>

            <div className="border-t border-cardborder pt-3">
              <button
                type="button"
                onClick={deleteManaged}
                className="pill w-full justify-center bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-100 dark:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
                Categorie verwijderen
              </button>
              <p className="mt-1.5 text-center text-[11px] text-slate-400">
                De transacties gaan terug naar &ldquo;Overig&rdquo;.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
