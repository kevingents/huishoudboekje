'use client'

import { useMemo, useState } from 'react'
import { PieChart, ChevronRight } from 'lucide-react'
import DashboardCard from './DashboardCard'
import Modal from './Modal'
import { cleanLabel, isSpendingCategory } from '@/lib/budget'
import type { Transaction } from '@/lib/types'

const PALETTE = [
  '#35B558', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e', '#14b8a6', '#6366f1', '#fb923c', '#94a3b8',
]
const MONTHS_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function pad(n: number) {
  return String(n).padStart(2, '0')
}
/** Maand (yyyy-mm) van een transactie: uit de datum, anders uit createdAt. */
function ymOf(t: Transaction): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(t.date || '')
  if (m) return `${m[1]}-${m[2]}`
  if (t.createdAt) {
    const d = new Date(t.createdAt)
    if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  }
  return null
}
function monthLabel(ym: string) {
  if (ym === 'onbekend') return 'Onbekend'
  const [y, mo] = ym.split('-')
  return `${MONTHS_NL[Number(mo) - 1] ?? ''} ${y}`
}

/** Toont waar het geld heen gaat: uitgaven per categorie als donut + ranglijst.
 *  Klik op een categorie voor de uitsplitsing per maand. */
export default function SpendingChart({ transactions }: { transactions: Transaction[] }) {
  // Alleen echte uitgaven (geen inkomsten/genegeerde posten).
  const spending = useMemo(
    () => transactions.filter((t) => isSpendingCategory(t.category) && (Number(t.amount) || 0) > 0),
    [transactions],
  )

  const sorted = useMemo(() => {
    const sums = new Map<string, number>()
    for (const t of spending) {
      const key = t.category || 'Overig'
      sums.set(key, (sums.get(key) ?? 0) + (Number(t.amount) || 0))
    }
    return [...sums.entries()].sort((a, b) => b[1] - a[1])
  }, [spending])

  const total = sorted.reduce((s, [, v]) => s + v, 0)
  const top = sorted.slice(0, 8)
  const restTotal = sorted.slice(8).reduce((s, [, v]) => s + v, 0)
  const segments: [string, number, boolean][] = [
    ...top.map(([c, v]) => [c, v, true] as [string, number, boolean]),
    ...(restTotal > 0 ? [['Overige categorieën', restTotal, false] as [string, number, boolean]] : []),
  ]

  const radius = 54
  const circ = 2 * Math.PI * radius
  let offset = 0

  const [selected, setSelected] = useState<string | null>(null)
  const detail = useMemo(() => {
    if (!selected) return null
    const txs = spending.filter((t) => (t.category || 'Overig') === selected)
    const byMonth = new Map<string, { sum: number; n: number }>()
    for (const t of txs) {
      const ym = ymOf(t) ?? 'onbekend'
      const g = byMonth.get(ym) ?? { sum: 0, n: 0 }
      g.sum += Number(t.amount) || 0
      g.n += 1
      byMonth.set(ym, g)
    }
    const months = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
    const max = Math.max(1, ...months.map(([, g]) => g.sum))
    const items = [...txs].sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1)).slice(0, 100)
    return { total: txs.reduce((s, t) => s + (Number(t.amount) || 0), 0), n: txs.length, months, max, items }
  }, [selected, spending])

  if (total === 0) {
    return (
      <DashboardCard title="Waar gaat het heen?" icon={PieChart} iconClassName="text-violet-500" className="lg:col-span-2">
        <p className="text-sm text-slate-500">
          Nog geen uitgaven om te verdelen. Voeg uitgaven toe (of importeer een bankafschrift) — dan zie
          je hier precies waar het meeste geld heen gaat.
        </p>
      </DashboardCard>
    )
  }

  const biggest = segments[0]

  return (
    <DashboardCard title="Waar gaat het heen?" icon={PieChart} iconClassName="text-violet-500" className="lg:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="relative mx-auto h-32 w-32 shrink-0 sm:mx-0 sm:h-40 sm:w-40">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" className="text-[#EBF1F4] dark:text-slate-700" strokeWidth="16" />
            {segments.map(([cat, value], i) => {
              const frac = value / total
              const dash = frac * circ
              const seg = (
                <circle
                  key={cat}
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth="16"
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-offset}
                />
              )
              offset += dash
              return seg
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] text-slate-500">Totaal</span>
            <span className="text-xl font-extrabold text-slate-800">€{Math.round(total)}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 self-stretch">
          <p className="mb-2 text-sm text-slate-600">
            Grootste post: <span className="font-bold text-slate-800">{biggest[0]}</span> — €
            {euro(biggest[1])} ({Math.round((biggest[1] / total) * 100)}%)
          </p>
          <ul className="flex flex-col gap-2">
            {segments.map(([cat, value, clickable], i) => {
              const pct = (value / total) * 100
              const color = PALETTE[i % PALETTE.length]
              const inner = (
                <>
                  <div className="mb-1 flex items-center gap-1.5 overflow-hidden text-sm sm:gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{cat}</span>
                    <span className="shrink-0 font-semibold text-slate-800">€{euro(value)}</span>
                    <span className="min-w-10 shrink-0 text-right text-xs text-slate-400">{Math.round(pct)}%</span>
                    {clickable && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </>
              )
              return (
                <li key={cat}>
                  {clickable ? (
                    <button
                      type="button"
                      onClick={() => setSelected(cat)}
                      className="w-full rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-slate-50"
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className="px-1 py-0.5">{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">Tip: klik op een categorie voor de uitgaven per maand.</p>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected} per maand` : ''}>
        {detail && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-500">
              Totaal <span className="font-bold text-slate-800">€{euro(detail.total)}</span> over {detail.n} transacties
            </p>
            <ul className="flex flex-col gap-2">
              {detail.months.map(([ym, g]) => (
                <li key={ym}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="w-20 shrink-0 capitalize text-slate-600">{monthLabel(ym)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(g.sum / detail.max) * 100}%` }} />
                    </div>
                    <span className="w-20 shrink-0 text-right font-semibold text-slate-800">€{euro(g.sum)}</span>
                    <span className="w-8 shrink-0 text-right text-xs text-slate-400">{g.n}×</span>
                  </div>
                </li>
              ))}
            </ul>
            <details className="border-t border-cardborder pt-2">
              <summary className="cursor-pointer text-sm font-semibold text-slate-600">Transacties tonen</summary>
              <ul className="mt-2 max-h-72 overflow-y-auto pr-1">
                {detail.items.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-1.5 text-sm">
                    <span className="w-20 shrink-0 text-xs text-slate-400">{t.date}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700" title={t.label}>
                      {cleanLabel(t.label)}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-800">€{euro(Number(t.amount) || 0)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </Modal>
    </DashboardCard>
  )
}
