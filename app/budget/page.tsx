import { BarChart3, TrendingUp } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import { budgetCategories, transactions, monthlyBudgetTarget } from '@/lib/mockData'

/** Static colour map per category accent (kept literal for Tailwind purging). */
const colorClasses: Record<string, { bar: string; iconBg: string; iconText: string }> = {
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  violet: { bar: 'bg-violet-500', iconBg: 'bg-violet-100', iconText: 'text-violet-600' },
  amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
  sky: { bar: 'bg-sky-500', iconBg: 'bg-sky-100', iconText: 'text-sky-600' },
}

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BudgetPage() {
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0)
  const totalLimit = budgetCategories.reduce((sum, cat) => sum + cat.limit, 0)
  const remaining = totalLimit - totalSpent

  // Circular progress maths.
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(totalSpent / totalLimit, 1)
  const offset = circumference * (1 - progress)

  return (
    <>
      <PageHeader
        title="Budget"
        subtitle="Mei 2026"
        icon={BarChart3}
        iconClassName="bg-brand-light text-brand"
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Overview ring */}
        <DashboardCard title="Totaal deze maand">
          <div className="flex items-center gap-5">
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
                <span className="text-2xl font-extrabold text-slate-800">€{totalSpent}</span>
                <span className="text-xs text-slate-500">van €{totalLimit}</span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-sm text-slate-500">Je hebt nog</p>
              <p className="text-3xl font-extrabold text-slate-800">€{remaining}</p>
              <p className="text-sm text-slate-500">te besteden</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
                <TrendingUp className="h-3.5 w-3.5" />
                Maandtarget €{monthlyBudgetTarget}
              </p>
            </div>
          </div>
        </DashboardCard>

        {/* Categories */}
        <DashboardCard title="Per categorie">
          <ul className="flex flex-col gap-4">
            {budgetCategories.map((cat) => {
              const colors = colorClasses[cat.color] ?? colorClasses.emerald
              const pct = Math.min(Math.round((cat.spent / cat.limit) * 100), 100)
              const Icon = cat.icon
              return (
                <li key={cat.name}>
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${colors.iconBg} ${colors.iconText}`}>
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-700">{cat.name}</span>
                    <span className="text-sm text-slate-500">
                      €{cat.spent} <span className="text-slate-400">/ €{cat.limit}</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </DashboardCard>

        {/* Recent transactions (full width) */}
        <DashboardCard title="Recente uitgaven" className="lg:col-span-2">
          <ul className="flex flex-col">
            {transactions.map((tx, index) => (
              <li key={tx.id}>
                <div className="flex items-center gap-3 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                    {tx.label.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{tx.label}</p>
                    <p className="text-xs text-slate-500">
                      {tx.category} · {tx.date}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">€{euro(tx.amount)}</p>
                </div>
                {index < transactions.length - 1 && <hr className="border-cardborder" />}
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </>
  )
}
