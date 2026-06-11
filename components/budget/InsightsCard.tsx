'use client'

import { useMemo } from 'react'
import { Lightbulb, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import { isSpendingCategory, periodKeyOf, periodRangeOf } from '@/lib/budget'
import type { Transaction } from '@/lib/types'

function euro(v: number) {
  return Math.round(v).toLocaleString('nl-NL')
}
function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Inzichten op basis van historie: deze periode vs. de vorige — totaal, grootste
 *  post en de categorieën waar je meer/minder uitgaf. Alles uit je eigen cijfers. */
export default function InsightsCard({
  transactions,
  periodStart = 1,
  budget = 0,
  periodWord = 'maand',
}: {
  transactions: Transaction[]
  periodStart?: number
  budget?: number
  periodWord?: string
}) {
  const data = useMemo(() => {
    const now = new Date()
    const cur = periodRangeOf(now, periodStart)
    const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const curKey = periodKeyOf(dstr(cur.start), periodStart) ?? ''
    // De dag vóór de huidige periode valt in de vorige periode (jaarwissel-veilig).
    const prevKey = periodKeyOf(dstr(new Date(cur.start.getTime() - 86400000)), periodStart) ?? ''

    const curByCat = new Map<string, number>()
    const prevByCat = new Map<string, number>()
    let curTotal = 0
    let prevTotal = 0
    for (const t of transactions) {
      if (!isSpendingCategory(t.category) || !(Number(t.amount) > 0)) continue
      const k = periodKeyOf(t.date, periodStart)
      const cat = t.category || 'Overig'
      const a = Number(t.amount) || 0
      if (k === curKey) {
        curByCat.set(cat, (curByCat.get(cat) ?? 0) + a)
        curTotal += a
      } else if (k === prevKey) {
        prevByCat.set(cat, (prevByCat.get(cat) ?? 0) + a)
        prevTotal += a
      }
    }

    const cats = new Set([...curByCat.keys(), ...prevByCat.keys()])
    const deltas = [...cats]
      .map((c) => ({ cat: c, delta: (curByCat.get(c) ?? 0) - (prevByCat.get(c) ?? 0) }))
      .sort((a, b) => b.delta - a.delta)
    const biggest = [...curByCat.entries()].sort((a, b) => b[1] - a[1])[0]

    return { curTotal, prevTotal, deltas, biggest, hasPrev: prevTotal > 0 }
  }, [transactions, periodStart])

  const { curTotal, prevTotal, deltas, biggest, hasPrev } = data
  const deltaTotal = curTotal - prevTotal
  const deltaPct = prevTotal > 0 ? Math.round((deltaTotal / prevTotal) * 100) : 0
  const up = deltas.filter((d) => d.delta > 5).slice(0, 2)
  const down = deltas.filter((d) => d.delta < -5).sort((a, b) => a.delta - b.delta).slice(0, 2)
  const maxBar = Math.max(1, curTotal, prevTotal)

  if (curTotal === 0 && prevTotal === 0) {
    return (
      <DashboardCard title="Inzichten" icon={Lightbulb} iconClassName="text-amber-500" className="lg:col-span-2">
        <p className="text-sm text-slate-500">
          Nog te weinig data voor inzichten. Importeer of voeg uitgaven toe — dan vergelijk ik automatisch met
          je vorige {periodWord}.
        </p>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard title="Inzichten" icon={Lightbulb} iconClassName="text-amber-500" className="lg:col-span-2">
      {/* Headline: deze periode vs vorige */}
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Je gaf deze {periodWord} <span className="font-bold text-slate-800 dark:text-slate-100">€{euro(curTotal)}</span> uit
        {hasPrev ? (
          <>
            {' '}
            —{' '}
            <span className={`font-semibold ${deltaTotal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {Math.abs(deltaPct)}% {deltaTotal > 0 ? 'meer' : 'minder'}
            </span>{' '}
            dan vorige {periodWord}.
          </>
        ) : (
          '.'
        )}
        {biggest ? (
          <>
            {' '}
            Grootste post: <span className="font-semibold text-slate-700 dark:text-slate-200">{biggest[0]}</span> (€
            {euro(biggest[1])}).
          </>
        ) : null}
      </p>

      {/* Vergelijkingsbalk deze vs vorige periode */}
      {hasPrev && (
        <div className="mt-4 flex flex-col gap-2">
          {[
            { label: `Deze ${periodWord}`, value: curTotal, active: true },
            { label: `Vorige ${periodWord}`, value: prevTotal, active: false },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-slate-500">{row.label}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={`block h-full rounded-full ${row.active ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'}`}
                  style={{ width: `${(row.value / maxBar) * 100}%` }}
                />
              </span>
              <span className="w-16 shrink-0 text-right font-semibold text-slate-800 dark:text-slate-100">
                €{euro(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Waar het verschil zit */}
      {(up.length > 0 || down.length > 0) && (
        <div className="mt-4 grid gap-2 border-t border-cardborder pt-3 sm:grid-cols-2">
          {up.map((d) => (
            <div key={d.cat} className="flex items-center gap-2 text-sm">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                <ArrowUpRight className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">Meer aan {d.cat}</span>
              <span className="shrink-0 font-semibold text-rose-600 dark:text-rose-400">+€{euro(d.delta)}</span>
            </div>
          ))}
          {down.map((d) => (
            <div key={d.cat} className="flex items-center gap-2 text-sm">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
                <ArrowDownRight className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">Minder aan {d.cat}</span>
              <span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">−€{euro(-d.delta)}</span>
            </div>
          ))}
        </div>
      )}

      {budget > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {curTotal <= budget
            ? `Je zit €${euro(budget - curTotal)} onder je budget van €${euro(budget)}.`
            : `Je zit €${euro(curTotal - budget)} boven je budget van €${euro(budget)}.`}
        </p>
      )}
    </DashboardCard>
  )
}
