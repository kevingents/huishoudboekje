'use client'

import { Sparkles, ChevronRight, TrendingDown } from 'lucide-react'
import DashboardCard from '../DashboardCard'

function euro(v: number) {
  return Math.round(v).toLocaleString('nl-NL')
}

/** AI Budget Coach: leidt inzichten + bespaarkansen rechtstreeks af uit je eigen
 *  cijfers (deze periode vs. je gemiddelde) — geen verzonnen data. */
export default function AiCoachCard({
  currentByCat,
  avgByCat,
  projected,
  budget,
  periodWord = 'maand',
}: {
  currentByCat: Map<string, number>
  avgByCat: Map<string, number>
  projected: number
  budget: number
  periodWord?: string
}) {
  const deltas = [...currentByCat.entries()]
    .map(([cat, cur]) => ({ cat, cur, delta: cur - (avgByCat.get(cat) ?? 0) }))
    .filter((d) => d.delta > 5)
    .sort((a, b) => b.delta - a.delta)

  const top = deltas[0]
  const overBudget = budget > 0 && projected > budget
  const headline = top
    ? `Je gaf deze ${periodWord} €${euro(top.delta)} meer uit aan ${top.cat} dan normaal.`
    : `Mooi — je uitgaven liggen deze ${periodWord} rond je gemiddelde.`
  const detail =
    budget > 0
      ? overBudget
        ? `Op dit tempo eindig je rond €${euro(projected - budget)} boven je budget van €${euro(budget)}.`
        : `Op dit tempo blijf je €${euro(budget - projected)} onder je budget van €${euro(budget)}.`
      : 'Stel een budget per categorie in voor scherpere tips.'
  const suggestions = deltas.slice(0, 2)

  return (
    <DashboardCard bg="bg-gradient-to-br from-brand-light to-white">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
          <Sparkles className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">AI Budget Coach</h2>
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
              Slim
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{headline}</p>
          <p className="text-sm text-slate-500">{detail}</p>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Mogelijke besparingen</p>
          <ul className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <li key={s.cat} className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2.5 dark:bg-white/5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:text-amber-300">
                  <TrendingDown className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{s.cat}</p>
                  <p className="text-xs text-slate-500">Meer dan normaal deze {periodWord}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">€{euro(s.delta)}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  )
}
