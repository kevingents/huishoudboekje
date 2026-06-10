'use client'

import { useMemo, useState } from 'react'
import { CalendarRange, ChevronDown } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { cleanLabel, isSpendingCategory } from '@/lib/budget'
import type { Transaction } from '@/lib/types'

const PALETTE = [
  '#35B558', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e', '#14b8a6', '#6366f1', '#fb923c', '#94a3b8',
]

function euro(v: number) {
  return v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
/** De (kalender)datum van een transactie: uit date (yyyy-mm-dd), 'Vandaag', anders createdAt. */
function txDate(t: Transaction): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t.date || '')
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (/^vandaag$/i.test(t.date || '')) return startOfDay(new Date())
  if (t.createdAt) {
    const d = new Date(t.createdAt)
    if (!isNaN(d.getTime())) return startOfDay(d)
  }
  return null
}

type Preset = 'today' | 'yesterday' | 'week' | 'lastmonth' | 'all' | 'custom'
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Vandaag' },
  { key: 'yesterday', label: 'Gisteren' },
  { key: 'week', label: 'Deze week' },
  { key: 'lastmonth', label: 'Vorige maand' },
  { key: 'all', label: 'Alles' },
  { key: 'custom', label: 'Eigen periode' },
]

/** Toont wat er is uitgegeven in een gekozen periode (vandaag/gisteren/week/vorige
 *  maand/eigen datumbereik), met de verdeling per categorie en de transacties. */
export default function SpendingFilter({ transactions }: { transactions: Transaction[] }) {
  const [preset, setPreset] = useState<Preset>('week')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [showTx, setShowTx] = useState(false)

  const { start, end, label } = useMemo(() => {
    const now = startOfDay(new Date())
    const fmt = (d: Date) => d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    if (preset === 'today') return { start: now, end: now, label: 'vandaag' }
    if (preset === 'yesterday') {
      const y = new Date(now)
      y.setDate(now.getDate() - 1)
      return { start: y, end: y, label: 'gisteren' }
    }
    if (preset === 'week') {
      const s = new Date(now)
      const dow = (now.getDay() + 6) % 7 // maandag = 0
      s.setDate(now.getDate() - dow)
      return { start: s, end: now, label: 'deze week' }
    }
    if (preset === 'lastmonth') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: s, end: e, label: s.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }) }
    }
    if (preset === 'custom') {
      const s = from ? startOfDay(new Date(from)) : null
      const e = to ? startOfDay(new Date(to)) : null
      return {
        start: s,
        end: e,
        label: s && e ? `${fmt(s)} – ${fmt(e)}` : s ? `vanaf ${fmt(s)}` : e ? `t/m ${fmt(e)}` : 'eigen periode',
      }
    }
    return { start: null as Date | null, end: null as Date | null, label: 'alle tijd' }
  }, [preset, from, to])

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        if (!isSpendingCategory(t.category) || !(Number(t.amount) > 0)) return false
        if (preset === 'all') return true
        const d = txDate(t)
        if (!d) return false
        if (start && d < start) return false
        if (end && d > end) return false
        return true
      }),
    [transactions, preset, start, end],
  )

  const total = filtered.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const byCat = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of filtered) {
      const k = t.category || 'Overig'
      m.set(k, (m.get(k) ?? 0) + (Number(t.amount) || 0))
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])
  const txList = useMemo(
    () => [...filtered].sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1)).slice(0, 100),
    [filtered],
  )

  return (
    <DashboardCard title="Uitgaven bekijken" icon={CalendarRange} iconClassName="text-sky-500" className="lg:col-span-2">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              preset === p.key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Van
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-cardborder bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Tot
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-cardborder bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            />
          </label>
        </div>
      )}

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="text-sm text-slate-500">
          Uitgegeven <span className="font-medium capitalize text-slate-600">{label}</span>
        </p>
        <p className="text-2xl font-extrabold text-slate-800">€{euro(total)}</p>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Geen uitgaven in deze periode.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {byCat.map(([cat, val], i) => {
              const pct = total ? (val / total) * 100 : 0
              const color = PALETTE[i % PALETTE.length]
              return (
                <li key={cat}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{cat}</span>
                    <span className="shrink-0 font-semibold text-slate-800">€{euro(val)}</span>
                    <span className="min-w-10 shrink-0 text-right text-xs text-slate-400">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            onClick={() => setShowTx((s) => !s)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showTx ? 'rotate-180' : ''}`} />
            {showTx ? 'Verberg transacties' : `Toon transacties (${filtered.length})`}
          </button>
          {showTx && (
            <ul className="mt-2 max-h-72 overflow-y-auto pr-1">
              {txList.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="w-20 shrink-0 text-xs text-slate-400">{t.date}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700" title={t.label}>
                    {cleanLabel(t.label)}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-800">€{euro(Number(t.amount) || 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </DashboardCard>
  )
}
