'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet, ChevronRight } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useBudget, useSettings, useFamilyBudgets } from '@/lib/hooks'
import { isSpendingCategory, periodKeyOf, txPeriodKey } from '@/lib/budget'

export default function BudgetCard() {
  const { categories, transactions } = useBudget()
  const { budgets } = useFamilyBudgets()
  const { settings } = useSettings()

  const periodStart =
    typeof settings.budgetPeriodStart === 'number' && settings.budgetPeriodStart >= 1 && settings.budgetPeriodStart <= 28
      ? settings.budgetPeriodStart
      : 1
  const periodWord = periodStart > 1 ? 'periode' : 'maand'

  // Datum pas na mount bepalen (geen hydratie-mismatch tussen server en client).
  const [currentKey, setCurrentKey] = useState<string | null>(null)
  useEffect(() => {
    const now = new Date()
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setCurrentKey(periodKeyOf(nowStr, periodStart) ?? '')
  }, [periodStart])

  // Heb je Gezinspotjes met een budget, dan toont de kaart die (totaal + geboekt).
  // Anders: de categorie-limieten en de echte transacties van deze periode.
  const potjeTotal = Math.round(budgets.reduce((s, b) => s + (b.limit || 0), 0))
  const potjeSpent = Math.round(budgets.reduce((s, b) => s + (b.spent || 0), 0))
  const usePotjes = potjeTotal > 0
  const catTotal = Math.round(categories.filter((c) => isSpendingCategory(c.name)).reduce((s, c) => s + c.limit, 0))
  const txSpent =
    currentKey == null
      ? 0
      : Math.round(
          transactions
            .filter((t) => isSpendingCategory(t.category) && (Number(t.amount) || 0) > 0 && txPeriodKey(t, periodStart) === currentKey)
            .reduce((s, t) => s + (Number(t.amount) || 0), 0),
        )
  const total = usePotjes ? potjeTotal : catTotal
  const spent = usePotjes ? potjeSpent : txSpent
  const remaining = total - spent
  const over = remaining < 0

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = total ? Math.min(spent / total, 1) : 0
  const offset = circumference * (1 - progress)

  return (
    <DashboardCard title={`Budget deze ${periodWord}`} icon={Wallet}>
      <div className="flex items-center gap-5">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="13" className="text-slate-100 dark:text-slate-700" />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={over ? '#F43F5E' : '#35B558'}
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">€{spent}</span>
            <span className="text-xs text-slate-500">van €{total}</span>
            <span className="text-xs text-slate-500">gebruikt</span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm text-slate-500">{over ? 'Je zit' : 'Je hebt nog'}</p>
          <p className={`text-3xl font-extrabold ${over ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
            {over ? '−' : ''}€{Math.abs(remaining)}
          </p>
          <p className="text-sm text-slate-500">{over ? 'over budget' : 'te besteden'}</p>
        </div>
      </div>

      <div className="mt-5 flex">
        <Link
          href="/budget"
          className="pill w-full border border-cardborder bg-white px-4 py-2.5 text-slate-700 hover:border-brand/40 hover:bg-brand-light hover:text-brand sm:ml-auto sm:w-auto"
        >
          Bekijk uitgaven
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </DashboardCard>
  )
}
