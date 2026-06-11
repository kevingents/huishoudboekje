'use client'

import { useState } from 'react'
import { Repeat, Plus, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useFixedCosts } from '@/lib/hooks'
import { fixedCostMonthly } from '@/lib/budget'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Abonnementen = vaste lasten met categorie "Abonnement". Je markeert ze in
 *  "Budget opschonen" (optie Abonnement) of voegt ze hier handmatig toe. */
export default function SubscriptionsCard() {
  const { costs, addCost, removeCost } = useFixedCosts()
  const subs = costs.filter((c) => c.isSubscription || (c.category || '').toLowerCase() === 'abonnement')
  const total = subs.reduce((s, c) => s + fixedCostMonthly(c), 0)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', interval: '1 month' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount.replace(',', '.'))
    if (!form.name.trim() || !amount) return
    await addCost({
      name: form.name.trim(),
      amount,
      category: 'Abonnement',
      isSubscription: true,
      subscriptionInterval: form.interval,
    })
    setForm({ name: '', amount: '', interval: '1 month' })
    setOpen(false)
  }

  const addBtn = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="pill bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-100 dark:text-sky-300"
    >
      <Plus className="h-3.5 w-3.5" />
      Abonnement
    </button>
  )

  return (
    <DashboardCard title="Abonnementen" icon={Repeat} iconClassName="text-sky-500" headerRight={addBtn}>
      {subs.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nog geen abonnementen. Markeer in <span className="font-semibold">Budget opschonen</span> een post
          als <span className="font-semibold">Abonnement</span>, of voeg er hier één toe (bijv. Netflix, krant,
          sportschool).
        </p>
      ) : (
        <>
          <ul className="flex flex-col">
            {subs.map((s, index) => {
              const monthly = fixedCostMonthly(s)
              return (
                <li key={s.id}>
                  <div className="group flex items-center gap-3 py-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600 dark:text-sky-300">
                      <Repeat className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {s.name}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {s.dueDay ? `incasso de ${s.dueDay}e · ` : ''}
                        {s.subscriptionInterval === '12 months' ? 'jaarlijks' : 'maandelijks'}
                        {s.subscriptionCancelable === false
                          ? s.subscriptionEndDate
                            ? ` · loopt af ${s.subscriptionEndDate}`
                            : ''
                          : ' · opzegbaar'}
                      </span>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                        €{euro(monthly)}
                        <span className="text-xs font-normal text-slate-400"> /mnd</span>
                      </span>
                      <span className="block text-[11px] text-slate-400">€{euro(monthly * 12)}/jr</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCost(s.id)}
                      aria-label={`${s.name} verwijderen`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {index < subs.length - 1 && <hr className="border-cardborder" />}
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-cardborder pt-3">
            <span className="text-sm font-semibold text-slate-600">Totaal</span>
            <span className="text-right">
              <span className="block text-sm font-extrabold text-slate-800 dark:text-slate-100">€{euro(total)} /mnd</span>
              <span className="block text-[11px] text-slate-400">€{euro(total * 12)} per jaar</span>
            </span>
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Abonnement toevoegen">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Naam
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Netflix"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Bedrag {form.interval === '12 months' ? 'per jaar' : 'per maand'} (€)
              <input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="12,99"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="w-32 text-xs font-semibold text-slate-500">
              Interval
              <select
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                <option value="1 month">Maandelijks</option>
                <option value="12 months">Jaarlijks</option>
              </select>
            </label>
          </div>
          <p className="text-[11px] text-slate-400">
            Meer instellen (opzegbaar / einddatum)? Bewerk het abonnement bij <span className="font-semibold">Vaste lasten</span>.
          </p>
          <button
            type="submit"
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Abonnement opslaan
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}
