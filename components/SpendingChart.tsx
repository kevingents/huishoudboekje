'use client'

import { PieChart } from 'lucide-react'
import DashboardCard from './DashboardCard'
import type { Transaction } from '@/lib/types'

const PALETTE = [
  '#35B558', // brand
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#fb923c', // orange
  '#94a3b8', // slate (overig)
]

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Toont waar het geld heen gaat: uitgaven per categorie als donut + ranglijst. */
export default function SpendingChart({ transactions }: { transactions: Transaction[] }) {
  // Som per categorie.
  const sums = new Map<string, number>()
  for (const t of transactions) {
    const amt = Number(t.amount) || 0
    if (amt <= 0) continue
    const key = t.category || 'Overig'
    sums.set(key, (sums.get(key) ?? 0) + amt)
  }
  const sorted = [...sums.entries()].sort((a, b) => b[1] - a[1])
  const total = sorted.reduce((s, [, v]) => s + v, 0)

  // Top 8 + de rest als "Overig".
  const top = sorted.slice(0, 8)
  const restTotal = sorted.slice(8).reduce((s, [, v]) => s + v, 0)
  const segments = restTotal > 0 ? [...top, ['Overig', restTotal] as [string, number]] : top

  const radius = 54
  const circ = 2 * Math.PI * radius
  let offset = 0

  if (total === 0) {
    return (
      <DashboardCard title="Waar gaat het heen?" icon={PieChart} iconClassName="text-violet-500" className="lg:col-span-2">
        <p className="text-sm text-slate-500">
          Nog geen uitgaven om te verdelen. Voeg uitgaven toe (of importeer je budget-Excel) — dan zie
          je hier precies waar het meeste geld heen gaat.
        </p>
      </DashboardCard>
    )
  }

  const biggest = segments[0]

  return (
    <DashboardCard title="Waar gaat het heen?" icon={PieChart} iconClassName="text-violet-500" className="lg:col-span-2">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Donut */}
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#EBF1F4" strokeWidth="16" />
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

        {/* Ranglijst */}
        <div className="min-w-0 flex-1 self-stretch">
          <p className="mb-2 text-sm text-slate-600">
            Grootste post: <span className="font-bold text-slate-800">{biggest[0]}</span> — €
            {euro(biggest[1])} ({Math.round((biggest[1] / total) * 100)}%)
          </p>
          <ul className="flex flex-col gap-2">
            {segments.map(([cat, value], i) => {
              const pct = (value / total) * 100
              return (
                <li key={cat}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{cat}</span>
                    <span className="shrink-0 font-semibold text-slate-800">€{euro(value)}</span>
                    <span className="w-10 shrink-0 text-right text-xs text-slate-400">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </DashboardCard>
  )
}
