'use client'

import { useEffect, useState } from 'react'
import { PiggyBank } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import { useBudget, useSettings } from '@/lib/hooks'
import { isSpendingCategory } from '@/lib/budget'
import { computeDailyBudget } from '@/lib/dailyBudget'

const round = (n: number) => Math.round(n)

/**
 * Dagpotje per categorie: de categorielimiet wordt over de budgetperiode verdeeld
 * tot een dagbudget, met rollover — wat je een dag niet opmaakt, telt op bij wat
 * je nog hebt. Zo zie je per soort (boodschappen, horeca, …) wat er vandaag nog in zit.
 */
export default function CategoryDayPotsCard() {
  const { categories, transactions } = useBudget()
  const { settings } = useSettings()

  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const periodDay =
    typeof settings.budgetPeriodStart === 'number' && settings.budgetPeriodStart >= 1 && settings.budgetPeriodStart <= 28
      ? settings.budgetPeriodStart
      : 1

  const pots = categories
    .filter((c) => isSpendingCategory(c.name) && c.limit > 0)
    .map((c) => {
      const catTx = transactions.filter((t) => (t.category || 'Overig') === c.name)
      const r = now
        ? computeDailyBudget({ now, salaryDay: periodDay, spendablePerPeriod: c.limit, transactions: catTx })
        : null
      return { name: c.name, limit: c.limit, r }
    })
    .filter((p) => p.r)
    .sort((a, b) => b.limit - a.limit)

  if (!now) return null
  if (pots.length === 0) {
    return (
      <DashboardCard title="Dagpotjes per categorie" icon={PiggyBank} iconClassName="text-emerald-500">
        <p className="text-sm text-slate-500">
          Stel een maandlimiet in bij een categorie (hierboven), dan reken ik die om naar een dagbudget.
          Wat je een dag niet opmaakt, schuift door naar de volgende dag.
        </p>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard title="Dagpotjes per categorie" icon={PiggyBank} iconClassName="text-emerald-500">
      <p className="mb-3 text-xs text-slate-500">
        Je maandlimiet per categorie, verdeeld over de dagen van je budgetperiode. Wat je niet opmaakt,
        telt op bij wat je nog hebt.
      </p>
      <ul className="flex flex-col divide-y divide-cardborder">
        {pots.map((p) => {
          const avail = p.r!.availableToday
          const over = avail < 0
          return (
            <li key={p.name} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{p.name}</p>
                <p className="text-[11px] text-slate-400">
                  €{round(p.r!.dailyRate)}/dag · €{round(p.r!.weeklyRate)}/week · €{round(p.limit)}/maand
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-extrabold ${over ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {over ? '−' : ''}€{round(Math.abs(avail))}
                </p>
                <p className="text-[11px] text-slate-400">{over ? 'over budget' : 'vandaag nog'}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </DashboardCard>
  )
}
