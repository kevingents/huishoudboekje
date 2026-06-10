'use client'

import { TrendingUp } from 'lucide-react'
import DashboardCard from '../DashboardCard'

function euro(v: number) {
  return Math.round(v).toLocaleString('nl-NL')
}

/** Premium halve-cirkel gauge met de voortgang van deze periode: uitgegeven van
 *  budget, plus de drie kerncijfers (beschikbaar / verwacht / prognose). */
export default function BudgetProgressCard({
  spent,
  budget,
  projected,
  periodWord = 'maand',
}: {
  spent: number
  budget: number
  projected: number
  periodWord?: string
}) {
  const pct = budget > 0 ? Math.min(spent / budget, 1) : 0
  const pctLabel = budget > 0 ? Math.round((spent / budget) * 100) : 0
  const available = budget - spent
  const expectedRest = Math.max(0, projected - spent)
  const overBudget = budget > 0 && projected > budget
  const overBy = projected - budget

  const r = 80
  const cx = 100
  const cy = 100
  const arcLen = Math.PI * r
  const offset = arcLen * (1 - pct)
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const arcColor = overBudget ? '#F43F5E' : '#35B558'

  return (
    <DashboardCard title="Budgetvoortgang" className="lg:col-span-2">
      <div className="flex flex-col items-center">
        <div className="relative mx-auto w-full max-w-[18rem]">
          <svg viewBox="0 0 200 112" className="w-full">
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-700"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <path
              d={path}
              fill="none"
              stroke={arcColor}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={arcLen}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-x-0 bottom-1 top-10 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">€{euro(spent)}</span>
            <span className="text-sm text-slate-500">van €{euro(budget)}</span>
            <span className={`mt-0.5 text-xs font-semibold ${overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-brand'}`}>
              {pctLabel}% gebruikt
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-cardborder pt-4 text-center">
        <div>
          <p className="text-[11px] text-slate-500">Nog beschikbaar</p>
          <p
            className={`text-base font-extrabold sm:text-lg ${
              available < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {available < 0 ? '−' : ''}€{euro(Math.abs(available))}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500">Verwachte uitgaven</p>
          <p className="text-base font-extrabold text-amber-500 sm:text-lg">€{euro(expectedRest)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500">Prognose einde {periodWord}</p>
          <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">€{euro(projected)}</p>
        </div>
      </div>

      {overBudget && (
        <div className="mt-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            <TrendingUp className="h-3.5 w-3.5" />
            €{euro(overBy)} boven budget
          </span>
        </div>
      )}
    </DashboardCard>
  )
}
