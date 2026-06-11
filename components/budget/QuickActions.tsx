'use client'

import type { LucideIcon } from 'lucide-react'
import DashboardCard from '../DashboardCard'

export type QuickAction = {
  icon: LucideIcon
  label: string
  onClick: () => void
}

/** Horizontale strip met snelle acties onderaan het budgetdashboard. */
export default function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <DashboardCard title="Snelle acties" className="lg:col-span-2">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="flex min-w-[7rem] shrink-0 flex-col items-center gap-2 rounded-2xl bg-slate-50 px-3 py-4 text-center transition-colors hover:bg-brand-light dark:bg-white/5"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/15 text-brand">
              <a.icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{a.label}</span>
          </button>
        ))}
      </div>
    </DashboardCard>
  )
}
