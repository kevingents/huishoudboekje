'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Trash2, Pencil, PiggyBank } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import Modal from '../Modal'
import { useFamilyBudgets, useFamily, useIncome, useFixedCosts, useSubscriptions, useLoans, useSavings } from '@/lib/hooks'
import { monthlyPot } from '@/lib/budget'
import type { FamilyBudget } from '@/lib/types'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const COLORS = ['emerald', 'sky', 'violet', 'amber', 'rose'] as const
const barClass: Record<string, string> = {
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
}
function euro(v: number) {
  return Math.round(v).toLocaleString('nl-NL')
}

const emptyForm = { name: '', limit: '', savings: '', member: '', color: 'emerald' }

/** Gezinsbudget = gedeelde "potjes" (envelopes): een maandbudget per onderwerp,
 *  optioneel aan een gezinslid gekoppeld, met optioneel een maandelijks spaardeel. */
export default function GezinsbudgetCard({ className = '' }: { className?: string }) {
  const { budgets, addBudget, updateBudget, removeEntry, removeBudget } = useFamilyBudgets()
  const { members } = useFamily()
  const { incomes } = useIncome()
  const { costs } = useFixedCosts()
  const { subscriptions } = useSubscriptions()
  const { loans } = useLoans()
  const { goals } = useSavings()
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])
  // Hoeveel er nog te verdelen is: het maandoverschot − wat al in potjes zit.
  const pot = now ? monthlyPot({ incomes, costs, subscriptions, loans, goals, now }).pot : 0
  const allocated = budgets.reduce((s, b) => s + (b.limit || 0), 0)
  const remaining = Math.max(0, Math.round(pot - allocated))

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const openCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setOpen(true)
  }
  const openEdit = (b: FamilyBudget) => {
    setForm({
      name: b.name,
      limit: String(Math.round(b.limit)),
      savings: b.savings ? String(Math.round(b.savings)) : '',
      member: b.member ?? '',
      color: b.color,
    })
    setEditId(b.id)
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      limit: Number(form.limit.replace(',', '.')) || 0,
      savings: Number(form.savings.replace(',', '.')) || 0,
      member: form.member || null,
      color: form.color,
    }
    if (editId != null) await updateBudget(editId, payload)
    else await addBudget(payload)
    setForm(emptyForm)
    setEditId(null)
    setOpen(false)
  }

  return (
    <DashboardCard
      title="Gezinsbudget"
      icon={Users}
      iconClassName="text-brand"
      className={className}
      headerRight={
        <button
          type="button"
          onClick={openCreate}
          className="pill bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/15"
        >
          <Plus className="h-3.5 w-3.5" />
          Potje
        </button>
      }
    >
      {budgets.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nog geen gezinspotjes. Maak een potje (bijv. Boodschappen, of een potje per gezinslid) met een maandbudget;
          uitgaven boek je erop via “Uitgave toevoegen” (splitsen kan ook). Per potje kun je ook maandelijks sparen.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {budgets.map((b) => {
            const sav = b.savings || 0
            const budgetable = Math.max(0, b.limit - sav) // te besteden na sparen
            const pct = budgetable ? Math.min(Math.round((b.spent / budgetable) * 100), 100) : 0
            const over = budgetable > 0 && b.spent > budgetable
            const left = budgetable - b.spent
            return (
              <li key={b.id}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {b.name}
                    {b.member && (
                      <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10">
                        {b.member}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-slate-500">
                    €{euro(b.spent)} <span className="text-slate-400">/ €{euro(budgetable)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    aria-label={`${b.name} bewerken`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:bg-slate-100 hover:text-brand"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBudget(b.id)}
                    aria-label={`${b.name} verwijderen`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-rose-500' : barClass[b.color] ?? 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className={`mt-1 flex flex-wrap items-center gap-x-2 truncate text-[11px] font-semibold ${over ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                  <span>{over ? `€${euro(-left)} over budget` : `nog €${euro(left)} te besteden`}</span>
                  {sav > 0 && (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <PiggyBank className="h-3 w-3" />€{euro(sav)}/mnd sparen
                    </span>
                  )}
                </p>
                {(b.entries?.length ?? 0) > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {b.entries!.slice(0, 3).map((e, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span className="min-w-0 flex-1 truncate">{e.label}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          €{euro(e.amount)}
                          <button
                            type="button"
                            onClick={() => removeEntry(b, i)}
                            aria-label={`${e.label} verwijderen`}
                            className="leading-none text-slate-300 transition-colors hover:text-rose-500"
                          >
                            ×
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId != null ? 'Potje bewerken' : 'Nieuw gezinspotje'}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {now && pot > 0 && editId == null && (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:bg-white/5">
              Nog <span className="font-bold text-brand">€{remaining.toLocaleString('nl-NL')}</span> te verdelen van je
              maandoverschot (inkomsten − vaste lasten − sparen). Dat is samen het maximum voor je potjes.
            </p>
          )}
          <label className="text-xs font-semibold text-slate-500">
            Naam
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Boodschappen of Marielle"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Maandbudget (€)
              <input
                inputMode="decimal"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: e.target.value })}
                placeholder="500"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Gezinslid (optioneel)
              <select
                value={form.member}
                onChange={(e) => setForm({ ...form, member: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                <option value="">Hele gezin</option>
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            Maandelijks sparen (€, optioneel)
            <input
              inputMode="decimal"
              value={form.savings}
              onChange={(e) => setForm({ ...form, savings: e.target.value })}
              placeholder="0"
              className={`mt-1 ${inputClass}`}
            />
            <span className="mt-1 block font-normal text-[11px] text-slate-400">
              Zet maandelijks dit bedrag opzij vanuit dit potje. Het verlaagt wat er te besteden is — en dus ook het
              dagbudget als je dit potje kiest.
            </span>
          </label>
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Kleur</p>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  aria-label={c}
                  className={`h-8 w-8 rounded-full ${barClass[c]} ${
                    form.color === c ? 'ring-2 ring-slate-400 ring-offset-2 dark:ring-offset-slate-800' : ''
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            {editId != null ? 'Opslaan' : 'Potje opslaan'}
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}
