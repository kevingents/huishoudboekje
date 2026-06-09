'use client'

import { useState } from 'react'
import { Banknote, Plus, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useIncome } from '@/lib/hooks'
import { monthlyEquivalent } from '@/lib/budget'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const CATS: { value: string; label: string }[] = [
  { value: 'loon', label: 'Loon / salaris' },
  { value: 'toeslag', label: 'Toeslag' },
  { value: 'uitkering', label: 'Uitkering / pensioen' },
  { value: 'overig', label: 'Overig' },
]

// Snelkeuzes voor veelvoorkomende inkomsten.
const SUGGESTIONS: { label: string; category: string }[] = [
  { label: 'Loon', category: 'loon' },
  { label: 'Kinderbijslag', category: 'toeslag' },
  { label: 'Zorgtoeslag', category: 'toeslag' },
  { label: 'Huurtoeslag', category: 'toeslag' },
  { label: 'Kinderopvangtoeslag', category: 'toeslag' },
  { label: 'Hypotheekteruggave', category: 'overig' },
  { label: 'AOW', category: 'uitkering' },
  { label: 'Uitkering', category: 'uitkering' },
  { label: 'Pensioen', category: 'uitkering' },
  { label: 'Alimentatie', category: 'overig' },
  { label: 'Vakantiegeld', category: 'loon' },
]

const catLabel = (c: string) => CATS.find((x) => x.value === c)?.label ?? 'Overig'

export default function IncomeCard({ className = '' }: { className?: string }) {
  const { incomes, addIncome, removeIncome } = useIncome()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ label: '', amount: '', category: 'loon', interval: '1 month' })

  const totalMonthly = incomes.reduce((sum, i) => sum + monthlyEquivalent(i.amount, i.interval), 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount.replace(',', '.'))
    if (!form.label.trim() || !amount) return
    await addIncome({ label: form.label.trim(), amount, category: form.category, interval: form.interval })
    setForm({ label: '', amount: '', category: 'loon', interval: '1 month' })
    setOpen(false)
  }

  return (
    <DashboardCard
      title="Inkomsten"
      icon={Banknote}
      iconClassName="text-emerald-500"
      className={className}
      headerRight={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pill bg-emerald-50 px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Inkomst
        </button>
      }
    >
      {incomes.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nog geen inkomsten. Voeg loon, toeslagen of uitkeringen toe om je netto-budget te zien.
        </p>
      ) : (
        <ul className="flex flex-col">
          {incomes.map((i, index) => (
            <li key={i.id}>
              <div className="group flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{i.label}</p>
                  <p className="text-xs text-slate-400">
                    {catLabel(i.category)} · {i.interval === '12 months' ? 'per jaar' : 'per maand'}
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-600">
                  +€{euro(i.amount)}
                  <span className="text-xs font-normal text-slate-400">
                    {i.interval === '12 months' ? ' /jr' : ' /mnd'}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => removeIncome(i.id)}
                  aria-label={`${i.label} verwijderen`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {index < incomes.length - 1 && <hr className="border-cardborder" />}
            </li>
          ))}
        </ul>
      )}

      {incomes.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-cardborder pt-3">
          <span className="text-sm font-semibold text-slate-600">Totaal per maand</span>
          <span className="text-sm font-extrabold text-emerald-600">+€{euro(totalMonthly)}</span>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Inkomst toevoegen">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setForm((f) => ({ ...f, label: s.label, category: s.category }))}
                className={`pill px-2.5 py-1 text-xs font-semibold ring-1 ring-cardborder transition-colors ${
                  form.label === s.label ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <label className="text-xs font-semibold text-slate-500">
            Omschrijving
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Bijv. Loon Sanne"
              className={`mt-1 ${inputClass}`}
            />
          </label>

          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Bedrag (€)
              <input
                autoFocus
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="w-32 text-xs font-semibold text-slate-500">
              Per
              <select
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                <option value="1 month">Maand</option>
                <option value="12 months">Jaar</option>
              </select>
            </label>
          </div>

          <label className="text-xs font-semibold text-slate-500">
            Soort
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={`mt-1 ${inputClass}`}
            >
              {CATS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Inkomst opslaan
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}
