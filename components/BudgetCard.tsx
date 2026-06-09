'use client'

import Link from 'next/link'
import { Wallet, ChevronRight } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useBudget } from '@/lib/hooks'

export default function BudgetCard() {
  const { categories } = useBudget()
  const spent = Math.round(categories.reduce((sum, c) => sum + c.spent, 0))
  const total = Math.round(categories.reduce((sum, c) => sum + c.limit, 0))
  const remaining = total - spent

  // Circular progress maths.
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = total ? Math.min(spent / total, 1) : 0
  const offset = circumference * (1 - progress)

  return (
    <DashboardCard title="Budget boodschappen deze maand" icon={Wallet}>
      <div className="flex items-center gap-5">
        {/* Circular progress */}
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#EBF1F4" strokeWidth="13" />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="#35B558"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-extrabold text-slate-800">€{spent}</span>
            <span className="text-xs text-slate-500">van €{total}</span>
            <span className="text-xs text-slate-500">gebruikt</span>
          </div>
        </div>

        {/* Remaining */}
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Je hebt nog</p>
          <p className="text-3xl font-extrabold text-slate-800">€{remaining}</p>
          <p className="text-sm text-slate-500">te besteden</p>
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
