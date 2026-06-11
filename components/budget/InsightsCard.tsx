'use client'

import { useMemo } from 'react'
import { Sparkles, ArrowUpRight, ArrowDownRight, TrendingDown } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import { isSpendingCategory, periodKeyOf, periodRangeOf, shiftPeriodKey } from '@/lib/budget'
import type { Transaction } from '@/lib/types'

function euro(v: number) {
  return Math.round(v).toLocaleString('nl-NL')
}
function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Inzichten + coach in één kaart: vergelijkt deze periode met de vorige (totaal,
 *  grootste post, waar je meer/minder uitgaf), toont je prognose t.o.v. je budget,
 *  en geeft bespaarkansen (categorieën boven je gemiddelde). Alles uit je cijfers. */
export default function InsightsCard({
  transactions,
  periodStart = 1,
  budget = 0,
  projected = 0,
  avgByCat,
}: {
  transactions: Transaction[]
  periodStart?: number
  budget?: number
  projected?: number
  avgByCat: Map<string, number>
}) {
  const periodWord = periodStart > 1 ? 'periode' : 'maand'

  const data = useMemo(() => {
    const now = new Date()
    const cur = periodRangeOf(now, periodStart)
    const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const curKey = periodKeyOf(dstr(cur.start), periodStart) ?? ''
    const prevKey = shiftPeriodKey(curKey, -1)

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
    // Bespaarkansen: categorieën waar je deze periode boven je eigen gemiddelde zit.
    const savings = [...curByCat.entries()]
      .map(([cat, cur]) => ({ cat, over: cur - (avgByCat.get(cat) ?? 0) }))
      .filter((s) => s.over > 5)
      .sort((a, b) => b.over - a.over)
      .slice(0, 2)
    return { curTotal, prevTotal, deltas, biggest, savings, hasPrev: prevTotal > 0 }
  }, [transactions, periodStart, avgByCat])

  const { curTotal, prevTotal, deltas, biggest, savings, hasPrev } = data
  const deltaTotal = curTotal - prevTotal
  const deltaPct = prevTotal > 0 ? Math.round((deltaTotal / prevTotal) * 100) : 0
  const up = deltas.filter((d) => d.delta > 5).slice(0, 2)
  const down = deltas.filter((d) => d.delta < -5).sort((a, b) => a.delta - b.delta).slice(0, 2)
  const maxBar = Math.max(1, curTotal, prevTotal)
  const overBudget = budget > 0 && projected > budget

  if (curTotal === 0 && prevTotal === 0) {
    return (
      <DashboardCard bg="bg-gradient-to-br from-brand-light to-white" className="lg:col-span-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" strokeWidth={2.2} />
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Inzichten</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Nog te weinig data. Importeer of voeg uitgaven toe — dan vergelijk ik automatisch met je vorige{' '}
          {periodWord} en geef ik bespaartips.
        </p>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard bg="bg-gradient-to-br from-brand-light to-white" className="lg:col-span-2">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
          <Sparkles className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Inzichten</h2>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
          Slim
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
        Je gaf deze {periodWord} <span className="font-bold">€{euro(curTotal)}</span> uit
        {hasPrev ? (
          <>
            {' '}
            —{' '}
            <span className={deltaTotal > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold text-emerald-600 dark:text-emerald-400'}>
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
            Grootste post: <span className="font-semibold">{biggest[0]}</span> (€{euro(biggest[1])}).
          </>
        ) : null}
      </p>
      {budget > 0 && (
        <p className="text-sm text-slate-500">
          {overBudget
            ? `Op dit tempo eindig je rond €${euro(projected - budget)} boven je budget van €${euro(budget)}.`
            : `Op dit tempo blijf je €${euro(budget - projected)} onder je budget van €${euro(budget)}.`}
        </p>
      )}

      {hasPrev && (
        <div className="mt-4 flex flex-col gap-2">
          {[
            { label: `Deze ${periodWord}`, value: curTotal, active: true },
            { label: `Vorige ${periodWord}`, value: prevTotal, active: false },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-slate-500">{row.label}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/70 dark:bg-white/10">
                <span
                  className={`block h-full rounded-full ${row.active ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'}`}
                  style={{ width: `${(row.value / maxBar) * 100}%` }}
                />
              </span>
              <span className="w-16 shrink-0 text-right font-semibold text-slate-900 dark:text-slate-100">
                €{euro(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {(up.length > 0 || down.length > 0) && (
        <div className="mt-4 grid gap-2 border-t border-white/60 pt-3 dark:border-white/10 sm:grid-cols-2">
          {up.map((d) => (
            <div key={d.cat} className="flex items-center gap-2 text-sm">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-500 dark:bg-rose-500/20">
                <ArrowUpRight className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">Meer aan {d.cat}</span>
              <span className="shrink-0 font-semibold text-rose-600 dark:text-rose-400">+€{euro(d.delta)}</span>
            </div>
          ))}
          {down.map((d) => (
            <div key={d.cat} className="flex items-center gap-2 text-sm">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-500 dark:bg-emerald-500/20">
                <ArrowDownRight className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">Minder aan {d.cat}</span>
              <span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">−€{euro(-d.delta)}</span>
            </div>
          ))}
        </div>
      )}

      {savings.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Mogelijke besparingen</p>
          <ul className="flex flex-col gap-2">
            {savings.map((s) => (
              <li key={s.cat} className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2.5 dark:bg-white/5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:text-amber-300">
                  <TrendingDown className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{s.cat}</p>
                  <p className="text-xs text-slate-500">Boven je gemiddelde deze {periodWord}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">€{euro(s.over)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  )
}
