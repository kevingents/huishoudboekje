'use client'

import { useState } from 'react'
import { PiggyBank, Plus, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useSavings } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function SavingsGoalsCard({ className = '' }: { className?: string }) {
  const { goals, addGoal, deposit, removeGoal } = useSavings()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', target: '' })
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = Number(form.target.replace(',', '.'))
    if (!form.name.trim() || !target) return
    await addGoal(form.name, target)
    setForm({ name: '', target: '' })
    setOpen(false)
  }

  const doDeposit = (id: number, goal: { id: number; saved: number; target: number; name: string }) => {
    const v = Number((drafts[id] ?? '').replace(',', '.'))
    if (!v) return
    deposit(goal, v)
    setDrafts((d) => ({ ...d, [id]: '' }))
  }

  return (
    <DashboardCard
      title="Spaardoelen"
      icon={PiggyBank}
      iconClassName="text-emerald-500"
      className={className}
      headerRight={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pill bg-brand-light px-3 py-1.5 text-xs text-brand hover:bg-emerald-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Doel
        </button>
      }
    >
      {goals.length === 0 ? (
        <p className="text-sm text-slate-500">Nog geen spaardoelen. Voeg er een toe.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {goals.map((g) => {
            const pct = g.target ? Math.min(Math.round((g.saved / g.target) * 100), 100) : 0
            return (
              <li key={g.id}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="flex-1 text-sm font-semibold text-slate-800">{g.name}</span>
                  <span className="text-sm text-slate-500">
                    €{Math.round(g.saved)} <span className="text-slate-400">/ €{Math.round(g.target)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeGoal(g.id)}
                    aria-label={`${g.name} verwijderen`}
                    className="grid h-7 w-7 place-items-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    doDeposit(g.id, g)
                  }}
                  className="mt-2 flex gap-2"
                >
                  <input
                    inputMode="decimal"
                    value={drafts[g.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
                    placeholder="Inleg €"
                    className="w-28 rounded-full border border-cardborder bg-white px-3 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                  />
                  <button
                    type="submit"
                    className="pill bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-cardborder hover:bg-slate-50"
                  >
                    Inleggen
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nieuw spaardoel">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Naam
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Zomervakantie"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Doelbedrag (€)
            <input
              inputMode="decimal"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              placeholder="1500"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Doel opslaan
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}
