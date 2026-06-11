'use client'

import { useState } from 'react'
import { Users, Plus, Trash2 } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import Modal from '../Modal'
import { useFamilyBudgets, useFamily } from '@/lib/hooks'
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

const emptyForm = { name: '', limit: '', member: '', color: 'emerald' }

/** Gezinsbudget = gedeelde "potjes" (envelopes): een maandbudget per onderwerp,
 *  optioneel aan een gezinslid gekoppeld. Uitgaven log je handmatig per potje. */
export default function GezinsbudgetCard({ className = '' }: { className?: string }) {
  const { budgets, addBudget, logSpend, removeBudget } = useFamilyBudgets()
  const { members } = useFamily()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await addBudget({
      name: form.name.trim(),
      limit: Number(form.limit.replace(',', '.')) || 0,
      member: form.member || null,
      color: form.color,
    })
    setForm(emptyForm)
    setOpen(false)
  }

  const doSpend = (b: FamilyBudget) => {
    const v = Number((drafts[b.id] ?? '').replace(',', '.'))
    if (!v) return
    logSpend(b, v)
    setDrafts((d) => ({ ...d, [b.id]: '' }))
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
          onClick={() => setOpen(true)}
          className="pill bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/15"
        >
          <Plus className="h-3.5 w-3.5" />
          Potje
        </button>
      }
    >
      {budgets.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nog geen gezinspotjes. Maak een potje (bijv. Boodschappen, Zakgeld, Schoolkosten) met een maandbudget
          en houd de uitgaven per potje bij.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {budgets.map((b) => {
            const pct = b.limit ? Math.min(Math.round((b.spent / b.limit) * 100), 100) : 0
            const over = b.limit > 0 && b.spent > b.limit
            const left = b.limit - b.spent
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
                    €{euro(b.spent)} <span className="text-slate-400">/ €{euro(b.limit)}</span>
                  </span>
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
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold ${over ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                    {over ? `€${euro(-left)} over budget` : `nog €${euro(left)} te besteden`}
                  </span>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      doSpend(b)
                    }}
                    className="flex gap-1.5"
                  >
                    <input
                      inputMode="decimal"
                      value={drafts[b.id] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [b.id]: e.target.value }))}
                      placeholder="Uitgave €"
                      className="w-24 rounded-full border border-cardborder bg-white px-3 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                    />
                    <button
                      type="submit"
                      className="pill bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-cardborder hover:bg-slate-50"
                    >
                      Boek
                    </button>
                  </form>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nieuw gezinspotje">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Naam
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Boodschappen"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Maandbudget (€)
              <input
                inputMode="decimal"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: e.target.value })}
                placeholder="500"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
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
                    form.color === c ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Potje opslaan
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}
