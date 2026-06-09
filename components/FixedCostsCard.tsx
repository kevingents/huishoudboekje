'use client'

import { useState } from 'react'
import { Repeat, Plus, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useFixedCosts } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FixedCostsCard({ className = '' }: { className?: string }) {
  const { costs, addCost, removeCost } = useFixedCosts()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', dueDay: '' })

  const total = costs.reduce((sum, c) => sum + c.amount, 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount.replace(',', '.'))
    if (!form.name.trim() || !amount) return
    await addCost(form.name, amount, form.dueDay ? Number(form.dueDay) : undefined)
    setForm({ name: '', amount: '', dueDay: '' })
    setOpen(false)
  }

  return (
    <DashboardCard
      title="Vaste lasten"
      icon={Repeat}
      iconClassName="text-sky-500"
      className={className}
      headerRight={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pill bg-sky-50 px-3 py-1.5 text-xs text-sky-600 hover:bg-sky-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Vaste last
        </button>
      }
    >
      {costs.length === 0 ? (
        <p className="text-sm text-slate-500">Nog geen vaste lasten. Voeg er een toe.</p>
      ) : (
        <ul className="flex flex-col">
          {costs.map((c, index) => (
            <li key={c.id}>
              <div className="group flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                  {c.dueDay && <p className="text-xs text-slate-400">de {c.dueDay}e van de maand</p>}
                </div>
                <p className="text-sm font-bold text-slate-800">€{euro(c.amount)}</p>
                <button
                  type="button"
                  onClick={() => removeCost(c.id)}
                  aria-label={`${c.name} verwijderen`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {index < costs.length - 1 && <hr className="border-cardborder" />}
            </li>
          ))}
        </ul>
      )}

      {costs.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-cardborder pt-3">
          <span className="text-sm font-semibold text-slate-600">Totaal per maand</span>
          <span className="text-sm font-extrabold text-slate-800">€{euro(total)}</span>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nieuwe vaste last">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Omschrijving
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Huur, Energie, Verzekering"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Bedrag p/m (€)
              <input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="1200"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="w-28 text-xs font-semibold text-slate-500">
              Dag (optioneel)
              <input
                inputMode="numeric"
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                placeholder="1"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Opslaan
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}
