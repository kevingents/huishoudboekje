'use client'

import { useMemo, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { cleanLabel, isSpendingCategory, periodKeyOf } from '@/lib/budget'
import type { Transaction } from '@/lib/types'

const PALETTE = ['#35B558', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e', '#14b8a6', '#6366f1', '#fb923c', '#94a3b8']
const MONTHS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function currentYm() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
function labelOf(ym: string) {
  const [y, mo] = ym.split('-')
  return `${MONTHS_NL[Number(mo) - 1] ?? ''} ${y}`
}
function shiftYm(ym: string, delta: number) {
  const [y, mo] = ym.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
/** Periode-sleutel (yyyy-mm van de startmaand) van een transactie: uit de datum,
 *  anders uit createdAt. Houdt rekening met de ingestelde startdag. */
function keyOf(t: Transaction, startDay: number): string | null {
  let ds = t.date || ''
  if (!/^\d{4}-\d{2}-\d{2}/.test(ds) && t.createdAt) {
    const d = new Date(t.createdAt)
    if (!isNaN(d.getTime())) ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return periodKeyOf(ds, startDay)
}
/** Volledig label van een periode: kalendermaand of "25 jan – 24 feb" bij startdag > 1. */
function fullLabel(ym: string, startDay: number): string {
  if (startDay <= 1) return labelOf(ym)
  const [y, mo] = ym.split('-').map(Number)
  const start = new Date(y, mo - 1, startDay)
  const end = new Date(y, mo, startDay - 1)
  const f = (d: Date) => d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  return `${f(start)} – ${f(end)}`
}

export default function MonthlyOverview({
  transactions,
  periodStart = 1,
}: {
  transactions: Transaction[]
  periodStart?: number
}) {
  const isPeriod = periodStart > 1
  const byMonth = useMemo(() => {
    const m = new Map<string, Transaction[]>()
    for (const t of transactions) {
      if (!isSpendingCategory(t.category)) continue // inkomsten/genegeerd niet meetellen
      const ym = keyOf(t, periodStart)
      if (!ym) continue
      const list = m.get(ym) ?? []
      list.push(t)
      m.set(ym, list)
    }
    return m
  }, [transactions, periodStart])

  const monthsWithData = [...byMonth.keys()].sort()
  const [ym, setYm] = useState(() => monthsWithData[monthsWithData.length - 1] ?? currentYm())

  const monthTx = byMonth.get(ym) ?? []
  const total = monthTx.reduce((s, t) => s + (Number(t.amount) || 0), 0)

  // Verdeling per categorie.
  const sums = new Map<string, number>()
  for (const t of monthTx) {
    const a = Number(t.amount) || 0
    if (a <= 0) continue
    const k = t.category || 'Overig'
    sums.set(k, (sums.get(k) ?? 0) + a)
  }
  const breakdown = [...sums.entries()].sort((a, b) => b[1] - a[1])

  // Trend: 6 maanden eindigend op de gekozen maand.
  const trend: [string, number][] = []
  for (let i = 5; i >= 0; i--) {
    const k = shiftYm(ym, -i)
    trend.push([k, (byMonth.get(k) ?? []).reduce((s, t) => s + (Number(t.amount) || 0), 0)])
  }
  const trendMax = Math.max(1, ...trend.map(([, v]) => v))

  const sortedTx = [...monthTx].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 60)

  const navigator = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setYm(shiftYm(ym, -1))}
        aria-label={isPeriod ? 'Vorige periode' : 'Vorige maand'}
        className="grid h-8 w-8 place-items-center rounded-full border border-cardborder text-slate-500 hover:bg-slate-50"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-32 text-center text-sm font-bold capitalize text-slate-800">
        {fullLabel(ym, periodStart)}
      </span>
      <button
        type="button"
        onClick={() => setYm(shiftYm(ym, 1))}
        aria-label={isPeriod ? 'Volgende periode' : 'Volgende maand'}
        className="grid h-8 w-8 place-items-center rounded-full border border-cardborder text-slate-500 hover:bg-slate-50"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <DashboardCard
      title={isPeriod ? 'Periodeoverzicht' : 'Maandoverzicht'}
      icon={CalendarRange}
      iconClassName="text-violet-500"
      className="lg:col-span-2"
      headerRight={navigator}
    >
      {/* Trend laatste 6 maanden */}
      <div className="mb-4 flex items-end gap-2">
        {trend.map(([k, v]) => {
          const active = k === ym
          return (
            <button
              key={k}
              type="button"
              onClick={() => setYm(k)}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${labelOf(k)}: €${euro(v)}`}
            >
              <span className="text-[10px] font-semibold text-slate-500">€{Math.round(v)}</span>
              <span className="flex h-20 w-full items-end">
                <span
                  className={`w-full rounded-t-md transition-all ${active ? 'bg-brand' : 'bg-slate-200'}`}
                  style={{ height: `${Math.max(4, (v / trendMax) * 100)}%` }}
                />
              </span>
              <span className={`text-[10px] ${active ? 'font-bold text-brand' : 'text-slate-400'}`}>
                {labelOf(k).split(' ')[0].slice(0, 3)}
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-sm text-slate-500">
        Uitgaven in <span className="font-semibold capitalize text-slate-700">{fullLabel(ym, periodStart)}</span>
      </p>
      <p className="text-3xl font-extrabold text-slate-800">€{Math.round(total)}</p>
      <p className="mb-3 text-xs text-slate-400">{monthTx.length} transacties</p>

      {breakdown.length === 0 ? (
        <p className="text-sm text-slate-500">Geen uitgaven in deze {isPeriod ? 'periode' : 'maand'}.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2 border-t border-cardborder pt-3">
            {breakdown.slice(0, 8).map(([cat, value], i) => {
              const pct = (value / total) * 100
              return (
                <li key={cat}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{cat}</span>
                    <span className="shrink-0 font-semibold text-slate-800">€{euro(value)}</span>
                    <span className="w-9 shrink-0 text-right text-xs text-slate-400">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
                  </div>
                </li>
              )
            })}
          </ul>

          <details className="mt-4 border-t border-cardborder pt-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-600">
              Transacties van deze {isPeriod ? 'periode' : 'maand'} ({monthTx.length})
            </summary>
            <ul className="mt-2 max-h-64 overflow-y-auto pr-1">
              {sortedTx.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="w-16 shrink-0 text-xs text-slate-400">{t.date}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700" title={t.label}>
                    {cleanLabel(t.label)}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{t.category}</span>
                  <span className="w-16 shrink-0 text-right font-semibold text-slate-800">€{euro(t.amount)}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </DashboardCard>
  )
}
