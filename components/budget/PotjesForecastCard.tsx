'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, ArrowRightLeft } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import { useFamilyBudgets, useSettings } from '@/lib/hooks'
import { forecastPotjes, suggestShift, type PotjeStatus } from '@/lib/forecast'

const STATUS: Record<PotjeStatus, { label: string; cls: string }> = {
  'op-koers': { label: 'op koers', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  krap: { label: 'krap', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  over: { label: 'dreigt over', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
}

function euro(v: number) {
  return Math.round(Math.abs(v)).toLocaleString('nl-NL')
}

/** Prognose per gezinspotje op basis van het uitgavetempo deze periode, met een
 *  schuif-advies als een potje dreigt te overschrijden terwijl een ander ruimte over heeft. */
export default function PotjesForecastCard({ className = '' }: { className?: string }) {
  const { budgets, updateBudget } = useFamilyBudgets()
  const { settings } = useSettings()
  const periodStart =
    typeof settings.budgetPeriodStart === 'number' &&
    settings.budgetPeriodStart >= 1 &&
    settings.budgetPeriodStart <= 28
      ? settings.budgetPeriodStart
      : 1

  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  // Geen potjes? Dan is er niets te voorspellen — toon de kaart niet.
  if (budgets.filter((b) => (b.limit || 0) > 0).length === 0) return null

  const forecasts = now ? forecastPotjes(budgets, now, periodStart) : []
  const withData = forecasts.filter((f) => f.hasData)
  const shift = suggestShift(forecasts)

  const applyShift = async () => {
    if (!shift) return
    await Promise.all([
      updateBudget(shift.from.id, { limit: Math.max(0, Math.round(shift.from.limit - shift.amount)) }),
      updateBudget(shift.to.id, { limit: Math.round(shift.to.limit + shift.amount) }),
    ])
  }

  return (
    <DashboardCard title="Prognose per potje" icon={TrendingUp} iconClassName="text-brand" className={className}>
      {withData.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nog te weinig boekingen deze periode voor een prognose. Boek je uitgaven op een potje (ook bij het
          importeren van je afschrift), dan zie je hier vanzelf of je op koers ligt en of je kunt schuiven.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">Op basis van je tempo deze periode — verwacht eind van de periode.</p>
          <ul className="flex flex-col gap-3">
            {withData.map((f) => {
              const s = STATUS[f.status]
              const pct = f.limit ? Math.min(Math.round((f.projected / f.limit) * 100), 100) : 0
              const surplus = Math.round(f.surplus) // afronden vóór de woordkeuze (geen "€0 tekort")
              return (
                <li key={f.id}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800 dark:text-slate-100">
                      {f.name}
                      {f.member && <span className="ml-1.5 text-xs font-normal text-slate-400">{f.member}</span>}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.label}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${f.status === 'over' ? 'bg-rose-500' : f.status === 'krap' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    €{euro(f.periodSpent)} uitgegeven · prognose €{euro(f.projected)} van €{euro(f.limit)} —{' '}
                    {Math.abs(surplus) < 1 ? (
                      <span className="font-semibold text-slate-500">precies op budget</span>
                    ) : surplus > 0 ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">€{euro(surplus)} over</span>
                    ) : (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">€{euro(surplus)} tekort</span>
                    )}
                  </p>
                </li>
              )
            })}
          </ul>

          {shift && (
            <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-brand-light p-3 sm:flex-row sm:items-center">
              <ArrowRightLeft className="hidden h-5 w-5 shrink-0 text-brand sm:block" />
              <p className="min-w-0 flex-1 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold text-brand">{shift.to.name}</span> dreigt over budget te gaan en{' '}
                <span className="font-bold text-brand">{shift.from.name}</span> houdt over. Schuif{' '}
                <span className="font-bold">€{euro(shift.amount)}</span>?
              </p>
              <button
                type="button"
                onClick={applyShift}
                className="pill shrink-0 bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
              >
                Schuif €{euro(shift.amount)}
              </button>
            </div>
          )}
        </>
      )}
    </DashboardCard>
  )
}
