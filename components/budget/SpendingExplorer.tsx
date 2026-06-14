'use client'

import { useMemo, useState } from 'react'
import { CalendarRange, ChevronDown } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import MerchantAvatar from '../MerchantAvatar'
import { cleanLabel, isSpendingCategory, periodKeyOf, shiftPeriodKey } from '@/lib/budget'
import type { Transaction } from '@/lib/types'

const PALETTE = [
  '#35B558', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e', '#14b8a6', '#6366f1', '#fb923c', '#94a3b8',
]
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function euro(v: number) {
  return v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function pad(n: number) {
  return String(n).padStart(2, '0')
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function txDate(t: Transaction): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t.date || '')
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (/^vandaag$/i.test(t.date || '')) return startOfDay(new Date())
  if (t.createdAt) {
    const d = new Date(t.createdAt)
    if (!isNaN(d.getTime())) return startOfDay(d) // lokale kalenderdatum (zoals keyOf)
  }
  return null
}
/** Periode-sleutel van een transactie (datum óf createdAt), gegeven de startdag. */
function keyOf(t: Transaction, startDay: number): string | null {
  let ds = t.date || ''
  if (!/^\d{4}-\d{2}-\d{2}/.test(ds) && t.createdAt) {
    const d = new Date(t.createdAt)
    if (!isNaN(d.getTime())) ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return periodKeyOf(ds, startDay)
}
function rangeForKey(key: string, startDay: number): { start: Date; end: Date } {
  const sd = Math.min(28, Math.max(1, startDay))
  const [y, m] = key.split('-').map(Number)
  return { start: new Date(y, m - 1, sd), end: new Date(y, m, sd - 1) }
}
function fullLabel(key: string, startDay: number): string {
  const [y, m] = key.split('-').map(Number)
  if (startDay <= 1) return `${MONTHS[m - 1] ?? ''} ${y}`
  const { start, end } = rangeForKey(key, startDay)
  const f = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return `${f(start)} – ${f(end)}`
}

type Mode = 'today' | 'yesterday' | 'week' | 'period' | 'all' | 'custom'

/** Eén kaart om uitgaven te bekijken: snelkeuze-periodes + klikbare trend van de
 *  laatste 6 periodes, met totaal, verdeling per categorie en de transacties.
 *  (Vervangt de losse "Uitgaven bekijken"- en "Periodeoverzicht"-kaarten.) */
export default function SpendingExplorer({
  transactions,
  periodStart = 1,
}: {
  transactions: Transaction[]
  periodStart?: number
}) {
  const isPeriod = periodStart > 1
  const periodWord = isPeriod ? 'periode' : 'maand'

  const curKey = useMemo(() => {
    const now = new Date()
    return keyOf({ date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` } as Transaction, periodStart) ?? ''
  }, [periodStart])

  const [mode, setMode] = useState<Mode>('period')
  const [periodKey, setPeriodKey] = useState<string>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [showTx, setShowTx] = useState(false)
  const activeKey = periodKey || curKey

  const presets: { key: Mode; label: string }[] = [
    { key: 'today', label: 'Vandaag' },
    { key: 'yesterday', label: 'Gisteren' },
    { key: 'week', label: 'Deze week' },
    { key: 'period', label: isPeriod ? 'Deze periode' : 'Deze maand' },
    { key: 'all', label: 'Alles' },
    { key: 'custom', label: 'Eigen' },
  ]

  // Trend: totaal per spending-periode, en de laatste 6 sleutels eindigend op nu.
  const { trend, trendMax } = useMemo(() => {
    const byKey = new Map<string, number>()
    for (const t of transactions) {
      if (!isSpendingCategory(t.category) || !(Number(t.amount) > 0)) continue
      const k = keyOf(t, periodStart)
      if (!k) continue
      byKey.set(k, (byKey.get(k) ?? 0) + (Number(t.amount) || 0))
    }
    const keys: string[] = []
    for (let i = 5; i >= 0; i--) keys.push(shiftPeriodKey(curKey, -i))
    const t = keys.map((k) => ({ key: k, total: byKey.get(k) ?? 0 }))
    return { trend: t, trendMax: Math.max(1, ...t.map((x) => x.total)) }
  }, [transactions, periodStart, curKey])

  const { start, end, label } = useMemo(() => {
    const now = startOfDay(new Date())
    const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`
    if (mode === 'today') return { start: now, end: now, label: 'vandaag' }
    if (mode === 'yesterday') {
      const y = new Date(now)
      y.setDate(now.getDate() - 1)
      return { start: y, end: y, label: 'gisteren' }
    }
    if (mode === 'week') {
      const s = new Date(now)
      s.setDate(now.getDate() - ((now.getDay() + 6) % 7))
      return { start: s, end: now, label: 'deze week' }
    }
    if (mode === 'custom') {
      const s = from ? startOfDay(new Date(from)) : null
      const e = to ? startOfDay(new Date(to)) : null
      return {
        start: s,
        end: e,
        label: s && e ? `${fmt(s)} – ${fmt(e)}` : s ? `vanaf ${fmt(s)}` : e ? `t/m ${fmt(e)}` : 'eigen periode',
      }
    }
    if (mode === 'period') {
      const { start: s, end: e } = rangeForKey(activeKey, periodStart)
      return { start: s, end: e, label: fullLabel(activeKey, periodStart) }
    }
    return { start: null as Date | null, end: null as Date | null, label: 'alle tijd' }
  }, [mode, from, to, activeKey, periodStart])

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        if (!isSpendingCategory(t.category) || !(Number(t.amount) > 0)) return false
        if (mode === 'all') return true
        const d = txDate(t)
        if (!d) return false
        if (start && d < start) return false
        if (end && d > end) return false
        return true
      }),
    [transactions, mode, start, end],
  )

  const total = filtered.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const byCat = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of filtered) m.set(t.category || 'Overig', (m.get(t.category || 'Overig') ?? 0) + (Number(t.amount) || 0))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])
  const txList = useMemo(
    () => [...filtered].sort((a, b) => (txDate(b)?.getTime() ?? 0) - (txDate(a)?.getTime() ?? 0)).slice(0, 100),
    [filtered],
  )

  const pickPeriod = (key: string) => {
    setPeriodKey(key)
    setMode('period')
  }

  return (
    <DashboardCard title="Uitgaven" icon={CalendarRange} iconClassName="text-sky-500" className="lg:col-span-2">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => (p.key === 'period' ? pickPeriod(curKey) : setMode(p.key))}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === p.key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {mode === 'custom' && (
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

      {/* Trend laatste 6 periodes — klik om een periode te kiezen */}
      <div className="mt-4 flex items-end gap-2">
        {trend.map(({ key, total: v }) => {
          const active = mode === 'period' && key === activeKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => pickPeriod(key)}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${fullLabel(key, periodStart)}: €${euro(v)}`}
            >
              <span className="text-[10px] font-semibold text-slate-500">€{Math.round(v)}</span>
              <span className="flex h-16 w-full items-end">
                <span
                  className={`w-full rounded-t-md transition-all ${active ? 'bg-brand' : 'bg-slate-200'}`}
                  style={{ height: `${Math.max(4, (v / trendMax) * 100)}%` }}
                />
              </span>
              <span className={`text-[10px] ${active ? 'font-bold text-brand' : 'text-slate-500 dark:text-slate-300'}`}>
                {MONTHS[(Number(key.split('-')[1]) - 1 + 12) % 12]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="text-sm text-slate-500">
          Uitgegeven <span className="font-medium capitalize text-slate-600">{label}</span>
        </p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">€{euro(total)}</p>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Geen uitgaven in deze {mode === 'period' ? periodWord : 'periode'}.</p>
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
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{cat}</span>
                    <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-100">€{euro(val)}</span>
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
                <li key={t.id} className="flex items-center gap-2.5 py-1.5 text-sm">
                  <MerchantAvatar label={t.label} size="sm" />
                  <span className="w-16 shrink-0 text-xs text-slate-400">{t.date}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200" title={t.label}>
                    {cleanLabel(t.label)}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                    €{euro(Number(t.amount) || 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </DashboardCard>
  )
}
