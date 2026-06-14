'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserSearch } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import MerchantAvatar from '../MerchantAvatar'
import { useFamilyBudgets, useSettings } from '@/lib/hooks'
import { memberInsights, hasMemberPotjes, type InsightItem } from '@/lib/spendingInsights'

function euro(v: number) {
  return Math.round(v).toLocaleString('nl-NL')
}

function subtitle(it: InsightItem, periodWord: string): string {
  const parts: string[] = []
  if (it.perMonth >= 1.5) parts.push(`~${Math.round(it.perMonth)}×/mnd`)
  if (it.count > it.periodCount) parts.push(`${it.count}× totaal · €${euro(it.total)}`)
  const last = new Date(it.lastAt)
  if (!Number.isNaN(last.getTime())) parts.push(`laatst ${last.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`)
  return parts.join(' · ') || `deze ${periodWord}`
}

/** Persoonlijk inzicht: per gezinslid wat er gekocht wordt en hoe vaak
 *  (bijv. "Gezichtscreme · 3× deze periode"), uit de potje-boekingen. */
export default function PersonalInsightsCard({ className = '' }: { className?: string }) {
  const { budgets } = useFamilyBudgets()
  const { settings } = useSettings()
  const periodStart =
    typeof settings.budgetPeriodStart === 'number' &&
    settings.budgetPeriodStart >= 1 &&
    settings.budgetPeriodStart <= 28
      ? settings.budgetPeriodStart
      : 1
  const periodWord = periodStart > 1 ? 'periode' : 'maand'

  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const insights = useMemo(() => (now ? memberInsights(budgets, now, periodStart) : []), [budgets, now, periodStart])

  const [sel, setSel] = useState<string | null>(null)
  const active = insights.find((i) => i.member === sel) ?? insights[0] ?? null

  // Geen aan-een-lid-gekoppelde potjes? Dan tonen we de kaart niet.
  if (!hasMemberPotjes(budgets)) return null

  return (
    <DashboardCard
      title="Persoonlijk inzicht"
      icon={UserSearch}
      iconClassName="text-brand"
      className={className}
    >
      {insights.length === 0 ? (
        <p className="text-sm text-slate-500">
          Boek een uitgave op het potje van een gezinslid en typ erbij <em>wat</em> je kocht (bijv. “Gezichtscreme”) —
          dat kan ook met de boek-knop bij een geïmporteerde afschrift-regel. Dan zie je hier per persoon wat er gekocht
          wordt en hoe vaak, bijvoorbeeld 3× gezichtscreme deze {periodWord}.
        </p>
      ) : (
        <>
          {/* Kies een gezinslid */}
          <div className="mb-3 flex flex-wrap gap-2">
            {insights.map((i) => {
              const on = active?.member === i.member
              return (
                <button
                  key={i.member}
                  type="button"
                  onClick={() => setSel(i.member)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    on ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200'
                  }`}
                >
                  {i.member}
                </button>
              )
            })}
          </div>

          {active && (
            <>
              <p className="mb-1 text-sm text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{active.member}</span> kocht deze{' '}
                {periodWord}{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{active.periodCount}×</span> voor{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">€{euro(active.periodTotal)}</span>.
              </p>
              <ul className="mt-2 flex flex-col divide-y divide-cardborder">
                {active.items.slice(0, 12).map((it) => (
                  <li key={it.label} className="flex items-center gap-3 py-2">
                    <MerchantAvatar label={it.label} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{it.label}</p>
                      <p className="truncate text-xs text-slate-500">{subtitle(it, periodWord)}</p>
                    </div>
                    {it.periodCount > 0 && (
                      <span className="shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-xs font-bold text-brand">
                        {it.periodCount}× deze {periodWord}
                      </span>
                    )}
                    <span className="w-16 shrink-0 text-right text-sm font-bold text-slate-800 dark:text-slate-100">
                      €{euro(it.periodTotal > 0 ? it.periodTotal : it.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </DashboardCard>
  )
}
