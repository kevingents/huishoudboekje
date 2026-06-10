'use client'

import { useRef, useState } from 'react'
import { BarChart3, TrendingUp, Plus, Trash2, Pencil, LineChart, ScanLine, Sparkles } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import ModuleGate from '@/components/ModuleGate'
import SavingsGoalsCard from '@/components/SavingsGoalsCard'
import FixedCostsCard from '@/components/FixedCostsCard'
import IncomeCard from '@/components/IncomeCard'
import { useBudget, useSettings, useFixedCosts, useSubscriptions, useHousehold, useIncome } from '@/lib/hooks'
import { apiPost } from '@/lib/api'
import { resolveIcon } from '@/lib/icons'
import { monthlyEquivalent } from '@/lib/budget'
import type { BudgetCategory } from '@/lib/types'

const colorClasses: Record<string, { bar: string; iconBg: string; iconText: string }> = {
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  violet: { bar: 'bg-violet-500', iconBg: 'bg-violet-100', iconText: 'text-violet-600' },
  amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
  sky: { bar: 'bg-sky-500', iconBg: 'bg-sky-100', iconText: 'text-sky-600' },
}

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
  const { categories, transactions, isLoading, addTransaction, removeTransaction, updateCategory } =
    useBudget()
  const { settings } = useSettings()
  const { costs } = useFixedCosts()
  const { subscriptions } = useSubscriptions()
  const { incomes } = useIncome()
  const { can } = useHousehold()
  const target = typeof settings.budgetTarget === 'number' ? settings.budgetTarget : 500

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ label: '', category: '', amount: '' })

  // Bon/factuur scannen
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<{ items: ScanItem[]; advice: string } | null>(null)

  const openAdd = () => {
    setForm({ label: '', category: '', amount: '' })
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
      setForm({
        label: res.merchant || 'Bon',
        category: res.category || categories[0]?.name || '',
        amount: res.total ? String(res.total.toFixed(2)).replace('.', ',') : '',
      })
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

  const totalSpent = Math.round(categories.reduce((sum, c) => sum + c.spent, 0))
  const totalLimit = Math.round(categories.reduce((sum, c) => sum + c.limit, 0))
  const remaining = totalLimit - totalSpent

  // Maandprognose: vaste lasten + abonnementen (maandequivalent) + variabel budget
  const fixedTotal = costs.reduce((sum, c) => sum + c.amount, 0)
  const subsMonthly = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.interval), 0)
  const forecastTotal = fixedTotal + subsMonthly + totalLimit
  const incomeMonthly = incomes.reduce((sum, i) => sum + monthlyEquivalent(i.amount, i.interval), 0)
  const netto = incomeMonthly - forecastTotal

  // Vaste lasten gegroepeerd per categorie (voor de prognose-uitsplitsing).
  const costsByCategory = Object.entries(
    costs.reduce<Record<string, number>>((acc, c) => {
      const key = c.category || 'Overig'
      acc[key] = (acc[key] ?? 0) + c.amount
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = totalLimit ? Math.min(totalSpent / totalLimit, 1) : 0
  const offset = circumference * (1 - progress)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount.replace(',', '.'))
    if (!form.label.trim() || !amount) return
    await addTransaction({
      label: form.label,
      category: form.category || categories[0]?.name || 'Overig',
      amount,
    })
    setForm({ label: '', category: '', amount: '' })
    setOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Budget"
        subtitle="Mei 2026"
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

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Overview ring */}
        <DashboardCard title="Totaal deze maand">
          <div className="flex items-center gap-5">
            <div className="relative h-36 w-36 shrink-0">
              <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                <circle cx="64" cy="64" r={radius} fill="none" stroke="#EBF1F4" strokeWidth="13" />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke="#35B558"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-slate-800">€{totalSpent}</span>
                <span className="text-xs text-slate-500">van €{totalLimit}</span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-sm text-slate-500">Je hebt nog</p>
              <p className="text-3xl font-extrabold text-slate-800">€{remaining}</p>
              <p className="text-sm text-slate-500">te besteden</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
                <TrendingUp className="h-3.5 w-3.5" />
                Maandtarget €{target}
              </p>
            </div>
          </div>
        </DashboardCard>

        {/* Categories */}
        <DashboardCard title="Per categorie">
          <ul className="flex flex-col gap-4">
            {categories.map((cat) => {
              const colors = colorClasses[cat.color] ?? colorClasses.emerald
              const pct = cat.limit ? Math.min(Math.round((cat.spent / cat.limit) * 100), 100) : 0
              const Icon = resolveIcon(cat.icon)
              return (
                <li key={cat.id} className="group">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${colors.iconBg} ${colors.iconText}`}>
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-700">{cat.name}</span>
                    <span className="text-sm text-slate-500">
                      €{Math.round(cat.spent)} <span className="text-slate-400">/ €{Math.round(cat.limit)}</span>
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
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </DashboardCard>

        {/* Budgetplanner-module: prognose, spaardoelen, vaste lasten */}
        <div className="lg:col-span-2">
        <ModuleGate module="budgetplanner">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Maandprognose (full width) */}
        <DashboardCard title="Maandprognose" icon={LineChart} iconClassName="text-violet-500" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Inkomsten', value: incomeMonthly, tone: 'pos' as const },
              { label: 'Vaste lasten', value: fixedTotal, tone: 'default' as const },
              { label: 'Abonnementen', value: subsMonthly, tone: 'default' as const },
              { label: 'Variabel budget', value: totalLimit, tone: 'default' as const },
              { label: 'Uitgaven p/m', value: forecastTotal, tone: 'default' as const },
              { label: 'Netto over', value: netto, tone: netto >= 0 ? ('pos' as const) : ('neg' as const) },
            ].map((item) => {
              const box =
                item.tone === 'pos' ? 'bg-emerald-50' : item.tone === 'neg' ? 'bg-rose-50' : 'bg-slate-50'
              const txt =
                item.tone === 'pos' ? 'text-emerald-600' : item.tone === 'neg' ? 'text-rose-600' : 'text-slate-800'
              return (
                <div key={item.label} className={`rounded-2xl p-3 ${box}`}>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className={`text-lg font-extrabold ${txt}`}>
                    {item.value < 0 ? '−' : ''}€{euro(Math.abs(item.value))}
                  </p>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Netto = inkomsten − (vaste lasten + abonnementen + je categoriebudgetten).
          </p>

          {costsByCategory.length > 0 && (
            <div className="mt-4 border-t border-cardborder pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Vaste lasten per categorie
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                {costsByCategory.map(([cat, sum]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-600">{cat}</span>
                    <span className="shrink-0 font-semibold text-slate-800">€{euro(sum)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DashboardCard>

        {/* Inkomsten, vaste lasten, spaardoelen */}
        <IncomeCard />
        <FixedCostsCard />
        <SavingsGoalsCard />
        </div>
        </ModuleGate>
        </div>

        {/* Recent transactions (full width) */}
        <DashboardCard title="Recente uitgaven" className="lg:col-span-2">
          {isLoading && transactions.length === 0 ? (
            <p className="text-sm text-slate-400">Laden…</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500">Nog geen uitgaven geregistreerd.</p>
          ) : (
            <ul className="flex flex-col">
              {transactions.map((tx, index) => (
                <li key={tx.id}>
                  <div className="group flex items-center gap-3 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                      {tx.label.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{tx.label}</p>
                      <p className="text-xs text-slate-500">
                        {tx.category} · {tx.date}
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
                  {index < transactions.length - 1 && <hr className="border-cardborder" />}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
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
    </>
  )
}
