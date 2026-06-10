'use client'

import { useState } from 'react'
import { Banknote, Plus, Pencil, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { useIncome, useBudget, type Income } from '@/lib/hooks'
import { monthlyEquivalent, merchantKey, labelMatchesPattern } from '@/lib/budget'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MONTHS_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
function pad(n: number) {
  return String(n).padStart(2, '0')
}
function ymOf(t: { date?: string; createdAt?: string }): string {
  const m = /^(\d{4})-(\d{2})/.exec(t.date || '')
  if (m) return `${m[1]}-${m[2]}`
  if (t.createdAt) {
    const d = new Date(t.createdAt)
    if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  }
  return 'onbekend'
}
function monthLabel(ym: string) {
  if (ym === 'onbekend') return 'Onbekend'
  const [y, mo] = ym.split('-')
  return `${MONTHS_NL[Number(mo) - 1] ?? ''} ${y}`
}

const CATS: { value: string; label: string }[] = [
  { value: 'loon', label: 'Loon / salaris' },
  { value: 'kinderbijslag', label: 'Kinderbijslag' },
  { value: 'toeslag', label: 'Toeslag / teruggaaf' },
  { value: 'uitkering', label: 'Uitkering / pensioen' },
  { value: 'alimentatie', label: 'Alimentatie' },
  { value: 'overig', label: 'Overig' },
]

// Snelkeuzes voor veelvoorkomende inkomsten (met passend interval).
const SUGGESTIONS: { label: string; category: string; interval?: string }[] = [
  { label: 'Loon', category: 'loon' },
  { label: 'Kinderbijslag', category: 'kinderbijslag', interval: '3 months' },
  { label: 'Zorgtoeslag', category: 'toeslag' },
  { label: 'Huurtoeslag', category: 'toeslag' },
  { label: 'Kinderopvangtoeslag', category: 'toeslag' },
  { label: 'Hypotheekrenteaftrek', category: 'toeslag' },
  { label: 'AOW', category: 'uitkering' },
  { label: 'Uitkering', category: 'uitkering' },
  { label: 'Pensioen', category: 'uitkering' },
  { label: 'Alimentatie', category: 'overig' },
  { label: 'Vakantiegeld', category: 'loon', interval: '12 months' },
]

const catLabel = (c: string) => CATS.find((x) => x.value === c)?.label ?? 'Overig'

function intervalLabel(iv: string): string {
  if (/eenmalig|once/i.test(iv)) return 'eenmalig'
  if (/3\s*month/.test(iv)) return 'per kwartaal'
  if (/12\s*month|year/.test(iv)) return 'per jaar'
  return 'per maand'
}
function intervalSuffix(iv: string): string {
  if (/eenmalig|once/i.test(iv)) return ''
  if (/3\s*month/.test(iv)) return ' /kwt'
  if (/12\s*month|year/.test(iv)) return ' /jr'
  return ' /mnd'
}

const emptyForm = { label: '', amount: '', category: 'loon', interval: '1 month' }

export default function IncomeCard({ className = '' }: { className?: string }) {
  const { incomes, addIncome, updateIncome, removeIncome } = useIncome()
  const { transactions } = useBudget()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [detail, setDetail] = useState<Income | null>(null)

  const totalMonthly = incomes.reduce((sum, i) => sum + monthlyEquivalent(i.amount, i.interval), 0)
  // Eenmalige inkomsten tellen niet mee in het maandtotaal (zo afgesproken), maar we
  // tonen ze wel apart zodat het bedrag niet onzichtbaar wegvalt.
  const onceTotal = incomes
    .filter((i) => /eenmalig|once/i.test(i.interval))
    .reduce((sum, i) => sum + i.amount, 0)

  // Onderliggende bijschrijvingen bij een inkomstenpost (op de winkel-sleutel).
  const creditsFor = (inc: Income) =>
    transactions
      .filter((t) => t.category === 'Inkomsten' && labelMatchesPattern(t.label, merchantKey(inc.label)))
      .sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1))

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }
  const openEdit = (i: Income) => {
    setEditing(i)
    setForm({ label: i.label, amount: String(i.amount), category: i.category, interval: i.interval })
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount.replace(',', '.'))
    if (!form.label.trim() || !amount) return
    const payload = { label: form.label.trim(), amount, category: form.category, interval: form.interval }
    if (editing) await updateIncome(editing.id, payload)
    else await addIncome(payload)
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
          onClick={openAdd}
          className="pill bg-emerald-50 px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-100 dark:text-emerald-300"
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
              <div className="group flex items-center gap-2 py-2.5">
                <button type="button" onClick={() => setDetail(i)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-slate-800">{i.label}</p>
                  <p className="text-xs text-slate-400">
                    {catLabel(i.category)} · {intervalLabel(i.interval)} · <span className="text-brand">details</span>
                  </p>
                </button>
                <p className="text-sm font-bold text-emerald-600">
                  +€{euro(i.amount)}
                  <span className="text-xs font-normal text-slate-400">{intervalSuffix(i.interval)}</span>
                </p>
                <button
                  type="button"
                  onClick={() => openEdit(i)}
                  aria-label={`${i.label} bewerken`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
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
        <div className="mt-3 space-y-1.5 border-t border-cardborder pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Totaal per maand</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              +€{euro(totalMonthly)}
            </span>
          </div>
          {onceTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Eenmalig <span className="text-slate-400">(telt niet mee per maand)</span>
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+€{euro(onceTotal)}</span>
            </div>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Inkomst bewerken' : 'Inkomst toevoegen'}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {!editing && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, label: s.label, category: s.category, interval: s.interval ?? f.interval }))
                  }
                  className={`pill px-2.5 py-1 text-xs font-semibold ring-1 ring-cardborder transition-colors ${
                    form.label === s.label ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

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
                <option value="3 months">Kwartaal</option>
                <option value="12 months">Jaar</option>
                <option value="eenmalig">Eenmalig</option>
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
            {editing ? 'Opslaan' : 'Inkomst opslaan'}
          </button>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? detail.label : ''}>
        {detail &&
          (() => {
            const credits = creditsFor(detail)
            const total = credits.reduce((s, t) => s + (Number(t.amount) || 0), 0)
            const byMonth = new Map<string, { sum: number; n: number }>()
            for (const t of credits) {
              const ym = ymOf(t)
              const g = byMonth.get(ym) ?? { sum: 0, n: 0 }
              g.sum += Number(t.amount) || 0
              g.n += 1
              byMonth.set(ym, g)
            }
            const months = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
            const max = Math.max(1, ...months.map(([, g]) => g.sum))
            return (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-500">
                  Totaal <span className="font-bold text-emerald-600">+€{euro(total)}</span> over {credits.length}{' '}
                  {credits.length === 1 ? 'bijschrijving' : 'bijschrijvingen'}. Het maandbedrag is dit totaal
                  gedeeld door het aantal maanden in je data.
                </p>
                {months.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Geen gekoppelde bijschrijvingen gevonden — handmatig toegevoegd of de omschrijving wijkt af.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {months.map(([ym, g]) => (
                      <li key={ym} className="flex items-center gap-2 text-sm">
                        <span className="w-20 shrink-0 capitalize text-slate-600">{monthLabel(ym)}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(g.sum / max) * 100}%` }} />
                        </div>
                        <span className="w-24 shrink-0 text-right font-semibold text-emerald-600">+€{euro(g.sum)}</span>
                        <span className="w-7 shrink-0 text-right text-xs text-slate-400">{g.n}×</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })()}
      </Modal>
    </DashboardCard>
  )
}
