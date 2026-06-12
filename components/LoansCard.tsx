'use client'

import { useState } from 'react'
import { Landmark, Plus, Pencil, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useLoans, useBudget, type Loan } from '@/lib/hooks'
import { cleanLabel, isSpendingCategory, labelMatchesPattern, merchantKey } from '@/lib/budget'
import type { Transaction } from '@/lib/types'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Computed {
  matched: Transaction[]
  repaid: number
  remaining: number
  pct: number
  monthsLeft: number | null
}

function compute(loan: Loan, transactions: Transaction[]): Computed {
  const matched = loan.matchPattern
    ? transactions.filter(
        (t) =>
          isSpendingCategory(t.category) &&
          (Number(t.amount) || 0) > 0 &&
          labelMatchesPattern(t.label, loan.matchPattern as string) &&
          !(loan.excludePattern && labelMatchesPattern(t.label, loan.excludePattern)),
      )
    : []
  const repaidTx = matched.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const repaid = repaidTx + (loan.manualPaid || 0)
  const remaining = Math.max(0, loan.total - repaid)
  const pct = loan.total > 0 ? Math.min(100, (repaid / loan.total) * 100) : 0
  const monthsLeft = loan.termAmount && loan.termAmount > 0 ? Math.ceil(remaining / loan.termAmount) : null
  return { matched, repaid, remaining, pct, monthsLeft }
}

const emptyForm = { name: '', lender: '', total: '', termAmount: '', matchPattern: '', excludePattern: '', manualPaid: '' }

export default function LoansCard() {
  const { loans, addLoan, updateLoan, removeLoan } = useLoans()
  const { transactions } = useBudget()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [form, setForm] = useState(emptyForm)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }
  const openEdit = (loan: Loan) => {
    setEditing(loan)
    setForm({
      name: loan.name,
      lender: loan.lender ?? '',
      total: loan.total ? String(loan.total) : '',
      termAmount: loan.termAmount ? String(loan.termAmount) : '',
      matchPattern: loan.matchPattern ?? '',
      excludePattern: loan.excludePattern ?? '',
      manualPaid: loan.manualPaid ? String(loan.manualPaid) : '',
    })
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const num = (s: string) => Number(s.replace(',', '.')) || 0
    const payload = {
      name: form.name.trim(),
      lender: form.lender.trim() || null,
      total: num(form.total),
      termAmount: form.termAmount ? num(form.termAmount) : null,
      matchPattern: form.matchPattern.trim() || (form.lender.trim() ? merchantKey(form.lender) : null),
      excludePattern: form.excludePattern.trim() || null,
      manualPaid: form.manualPaid ? num(form.manualPaid) : 0,
    }
    if (editing) await updateLoan(editing.id, payload)
    else await addLoan(payload)
    setOpen(false)
  }

  const totalRemaining = loans.reduce((s, l) => s + compute(l, transactions).remaining, 0)

  const addBtn = (
    <button
      type="button"
      onClick={openAdd}
      className="pill bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/20"
    >
      <Plus className="h-4 w-4" />
      Lening
    </button>
  )

  return (
    <DashboardCard title="Leningen" icon={Landmark} iconClassName="text-rose-500" headerRight={addBtn}>
      {loans.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nog geen leningen. Voeg er één toe en geef een trefwoord (bijv. de naam van de geldverstrekker) —
          dan koppelt Fam je aflossingen automatisch en zie je hoeveel je nog moet betalen.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {loans.map((loan) => {
              const c = compute(loan, transactions)
              return (
                <li key={loan.id} className="group">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{loan.name}</span>
                      {loan.lender && <span className="block truncate text-xs text-slate-400">{loan.lender}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-slate-800">€{euro(c.remaining)}</span>
                      <span className="block text-[11px] text-slate-400">nog te betalen</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(loan)}
                      aria-label={`${loan.name} bewerken`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLoan(loan.id)}
                      aria-label={`${loan.name} verwijderen`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${c.pct}%` }} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span>
                      €{euro(c.repaid)} van €{euro(loan.total)} afgelost ({Math.round(c.pct)}%)
                    </span>
                    {c.monthsLeft !== null && c.remaining > 0 && (
                      <span className="text-slate-400">· nog ~{c.monthsLeft} maanden</span>
                    )}
                  </div>
                  {c.matched.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                        {c.matched.length} gekoppelde aflossingen
                      </summary>
                      <ul className="mt-1 max-h-40 overflow-y-auto pr-1">
                        {c.matched.slice(0, 50).map((t) => (
                          <li key={t.id} className="flex items-center gap-2 py-1 text-xs">
                            <span className="w-16 shrink-0 text-slate-400">{t.date}</span>
                            <span className="min-w-0 flex-1 truncate text-slate-600" title={t.label}>
                              {cleanLabel(t.label)}
                            </span>
                            <span className="shrink-0 font-semibold text-slate-700">€{euro(Number(t.amount) || 0)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-4 border-t border-cardborder pt-3 text-sm">
            <span className="text-slate-500">Totale restschuld: </span>
            <span className="font-extrabold text-slate-800">€{euro(totalRemaining)}</span>
          </p>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Lening bewerken' : 'Lening toevoegen'}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {!editing && (
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  label: 'Creditcard (ICS)',
                  form: { name: 'Creditcard (ICS)', lender: 'International Card Services', matchPattern: 'international card service' },
                },
                { label: 'Hypotheek', form: { name: 'Hypotheek', lender: '', matchPattern: 'hypoth' } },
                { label: 'Studieschuld (DUO)', form: { name: 'Studieschuld', lender: 'DUO', matchPattern: 'duo' } },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, ...p.form }))}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <label className="text-xs font-semibold text-slate-500">
            Naam
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Lening Boots Holding"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Geldverstrekker (optioneel)
            <input
              value={form.lender}
              onChange={(e) => setForm({ ...form, lender: e.target.value })}
              placeholder="Bijv. N C Boots Holding B.V."
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Totaal af te lossen (€)
              <input
                inputMode="decimal"
                value={form.total}
                onChange={(e) => setForm({ ...form, total: e.target.value })}
                placeholder="14000"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Maandtermijn (€, optioneel)
              <input
                inputMode="decimal"
                value={form.termAmount}
                onChange={(e) => setForm({ ...form, termAmount: e.target.value })}
                placeholder="500"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            Koppel-trefwoord
            <input
              value={form.matchPattern}
              onChange={(e) => setForm({ ...form, matchPattern: e.target.value })}
              placeholder="Bijv. betalingsregeling, eigen risico"
              className={`mt-1 ${inputClass}`}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              Transacties met dit woord in de omschrijving tellen als aflossing. Gebruik een{' '}
              <span className="font-semibold">specifiek</span> woord (niet alleen de naam) als je meerdere
              producten bij dezelfde instantie hebt.
            </span>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Uitsluiten (optioneel)
            <input
              value={form.excludePattern}
              onChange={(e) => setForm({ ...form, excludePattern: e.target.value })}
              placeholder="Bijv. premie"
              className={`mt-1 ${inputClass}`}
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              Transacties met dit woord tellen juist <span className="font-semibold">niet</span> mee — bv.
              “premie”, zodat je normale zorgverzekering niet bij deze aflossing wordt opgeteld.
            </span>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Al afgelost buiten deze transacties (€, optioneel)
            <input
              inputMode="decimal"
              value={form.manualPaid}
              onChange={(e) => setForm({ ...form, manualPaid: e.target.value })}
              placeholder="0"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            {editing ? 'Opslaan' : 'Lening toevoegen'}
          </button>
        </form>
      </Modal>
    </DashboardCard>
  )
}
