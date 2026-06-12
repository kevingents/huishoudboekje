'use client'

import { useState } from 'react'
import { Repeat, Plus, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useFixedCosts } from '@/lib/hooks'
import { FIXED_COST_CATEGORIES, fixedCostMonthly, suggestCostCategory } from '@/lib/budget'
import type { FixedCost } from '@/lib/types'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const emptyForm = {
  name: '',
  amount: '',
  dueDay: '',
  category: 'Overig',
  isSubscription: false,
  subscriptionInterval: '1 month',
  subscriptionCancelable: true,
  subscriptionEndDate: '',
}

export default function FixedCostsCard({ className = '' }: { className?: string }) {
  const { costs, addCost, updateCost, splitCost, removeCost } = useFixedCosts()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FixedCost | null>(null)
  const [form, setForm] = useState(emptyForm)
  // Of de gebruiker de categorie handmatig heeft gekozen (dan niet meer overschrijven).
  const [catTouched, setCatTouched] = useState(false)
  // Splitsen in rente + aflossing (hypotheek): het aflossingsdeel in euro's.
  const [splitDraft, setSplitDraft] = useState('')
  const [splitError, setSplitError] = useState<string | null>(null)

  const total = costs.reduce((sum, c) => sum + fixedCostMonthly(c), 0)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setCatTouched(false)
    setOpen(true)
  }

  const openEdit = (c: FixedCost) => {
    setEditing(c)
    setSplitDraft('')
    setSplitError(null)
    setForm({
      name: c.name,
      amount: String(c.amount).replace('.', ','),
      dueDay: c.dueDay ? String(c.dueDay) : '',
      category: c.category ?? 'Overig',
      isSubscription: c.isSubscription ?? false,
      subscriptionInterval: c.subscriptionInterval ?? '1 month',
      subscriptionCancelable: c.subscriptionCancelable ?? true,
      subscriptionEndDate: c.subscriptionEndDate ?? '',
    })
    setCatTouched(true)
    setOpen(true)
  }

  // Naam-wijziging: stel automatisch een categorie voor (tenzij handmatig gekozen).
  const onNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, category: catTouched ? f.category : suggestCostCategory(name) }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount.replace(',', '.'))
    if (!form.name.trim() || !amount) return
    const payload = {
      name: form.name.trim(),
      amount,
      dueDay: form.dueDay ? Math.min(28, Math.max(1, Number(form.dueDay))) : null,
      category: form.category,
      isSubscription: form.isSubscription,
      subscriptionInterval: form.isSubscription ? form.subscriptionInterval : null,
      subscriptionCancelable: form.isSubscription ? form.subscriptionCancelable : true,
      subscriptionEndDate:
        form.isSubscription && !form.subscriptionCancelable && form.subscriptionEndDate
          ? form.subscriptionEndDate
          : null,
    }
    if (editing) await updateCost(editing.id, payload)
    else await addCost(payload)
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
          onClick={openAdd}
          className="pill bg-sky-50 px-3 py-1.5 text-xs text-sky-600 hover:bg-sky-100 dark:text-sky-300"
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
                <button type="button" onClick={() => openEdit(c)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">
                      {c.category ?? 'Overig'}
                    </span>
                    {c.isSubscription && (
                      <span className="rounded-full bg-sky-100 px-1.5 py-0.5 font-medium text-sky-600 dark:text-sky-300">
                        abonnement · {c.subscriptionInterval === '12 months' ? 'jaarlijks' : 'maandelijks'}
                        {c.subscriptionCancelable
                          ? ' · opzegbaar'
                          : c.subscriptionEndDate
                            ? ` · tot ${c.subscriptionEndDate}`
                            : ''}
                      </span>
                    )}
                    {c.dueDay && <span>de {c.dueDay}e van de maand</span>}
                  </p>
                </button>
                <p className="text-sm font-bold text-slate-800">
                  €{euro(c.amount)}
                  {c.isSubscription && c.subscriptionInterval === '12 months' && (
                    <span className="text-xs font-normal text-slate-400"> /jr</span>
                  )}
                </p>
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Vaste last bewerken' : 'Nieuwe vaste last'}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Omschrijving
            <input
              autoFocus
              value={form.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Bijv. Huur, Energie, Zorgverzekering"
              className={`mt-1 ${inputClass}`}
            />
          </label>

          <label className="text-xs font-semibold text-slate-500">
            Categorie
            <select
              value={form.category}
              onChange={(e) => {
                setCatTouched(true)
                setForm({ ...form, category: e.target.value })
              }}
              className={`mt-1 ${inputClass}`}
            >
              {FIXED_COST_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {!editing && !catTouched && form.name.trim() && (
              <span className="mt-1 block text-[11px] text-slate-400">
                Voorstel op basis van de naam — pas gerust aan.
              </span>
            )}
          </label>

          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Bedrag {form.isSubscription && form.subscriptionInterval === '12 months' ? 'p/jaar' : 'p/m'} (€)
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

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={form.isSubscription}
              onChange={(e) => setForm({ ...form, isSubscription: e.target.checked })}
              className="h-4 w-4 rounded border-cardborder text-brand focus:ring-brand/30"
            />
            Dit is een abonnement
          </label>

          {form.isSubscription && (
            <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-3">
              <label className="text-xs font-semibold text-slate-500">
                Interval
                <select
                  value={form.subscriptionInterval}
                  onChange={(e) => setForm({ ...form, subscriptionInterval: e.target.value })}
                  className={`mt-1 ${inputClass}`}
                >
                  <option value="1 month">Maandelijks</option>
                  <option value="12 months">Jaarlijks</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.subscriptionCancelable}
                  onChange={(e) => setForm({ ...form, subscriptionCancelable: e.target.checked })}
                  className="h-4 w-4 rounded border-cardborder text-brand focus:ring-brand/30"
                />
                Maandelijks opzegbaar
              </label>
              {!form.subscriptionCancelable && (
                <label className="text-xs font-semibold text-slate-500">
                  Loopt af op
                  <input
                    type="date"
                    value={form.subscriptionEndDate}
                    onChange={(e) => setForm({ ...form, subscriptionEndDate: e.target.value })}
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
              )}
            </div>
          )}

          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            {editing ? 'Wijzigingen opslaan' : 'Opslaan'}
          </button>

          {editing && !form.isSubscription && (
            <div className="mt-1 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
              <p className="text-xs font-semibold text-slate-600">Splitsen in rente + aflossing (hypotheek)</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Het aflossingsdeel gaat naar de categorie Aflossingen (telt als vermogensopbouw, apart in je
                begroting); de rest blijft als rente in {form.category || 'deze categorie'}.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  inputMode="decimal"
                  value={splitDraft}
                  onChange={(e) => setSplitDraft(e.target.value)}
                  placeholder="Waarvan aflossing (€)"
                  className="min-w-0 flex-1 rounded-xl border border-cardborder bg-white px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!editing) return
                    const total = Number(form.amount.replace(',', '.'))
                    const afl = Number(splitDraft.replace(',', '.'))
                    if (!afl || afl <= 0 || afl >= total) {
                      setSplitError('Vul een aflossingsbedrag in dat groter is dan €0 en kleiner dan het totaal.')
                      return
                    }
                    setSplitError(null)
                    try {
                      await splitCost(editing.id, afl)
                      setSplitDraft('')
                      setOpen(false)
                    } catch {
                      setSplitError('Splitsen mislukt — probeer het opnieuw.')
                    }
                  }}
                  className="pill shrink-0 bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-cardborder hover:bg-slate-100"
                >
                  Splitsen
                </button>
              </div>
              {splitError && <p className="mt-1.5 text-[11px] font-medium text-rose-600">{splitError}</p>}
            </div>
          )}
        </form>
      </Modal>
    </DashboardCard>
  )
}
