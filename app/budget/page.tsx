'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Plus, Trash2, Pencil, LineChart } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import ModuleGate from '@/components/ModuleGate'
import SavingsGoalsCard from '@/components/SavingsGoalsCard'
import FixedCostsCard from '@/components/FixedCostsCard'
import { useBudget, useSettings, useFixedCosts, useSubscriptions } from '@/lib/hooks'
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

export default function BudgetPage() {
  const { categories, transactions, isLoading, addTransaction, removeTransaction, updateCategory } =
    useBudget()
  const { settings } = useSettings()
  const { costs } = useFixedCosts()
  const { subscriptions } = useSubscriptions()
  const target = typeof settings.budgetTarget === 'number' ? settings.budgetTarget : 500

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ label: '', category: '', amount: '' })

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
            onClick={() => setOpen(true)}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Vaste lasten', value: fixedTotal },
              { label: 'Abonnementen', value: subsMonthly },
              { label: 'Variabel budget', value: totalLimit },
              { label: 'Totaal p/m', value: forecastTotal, accent: true },
            ].map((item) => (
              <div
                key={item.label}
                className={['rounded-2xl p-3', item.accent ? 'bg-brand-light' : 'bg-slate-50'].join(' ')}
              >
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className={['text-lg font-extrabold', item.accent ? 'text-brand' : 'text-slate-800'].join(' ')}>
                  €{euro(item.value)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Verwachte maanduitgaven: vaste lasten + abonnementen (maandequivalent) + je categoriebudgetten.
          </p>
        </DashboardCard>

        {/* Spaardoelen + vaste lasten */}
        <SavingsGoalsCard />
        <FixedCostsCard />
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
