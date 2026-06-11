'use client'

import { CalendarClock, AlertTriangle } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import type { FixedCost } from '@/lib/types'

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
function euro(v: number) {
  return Math.round(v).toLocaleString('nl-NL')
}

/** Eerstvolgende afschrijvingen op basis van de afschrijfdag (dueDay) van je vaste
 *  lasten. Toont de datum, hoeveel dagen tot, en een waarschuwing als het dichtbij is. */
export default function UpcomingPaymentsCard({ costs }: { costs: FixedCost[] }) {
  const now = new Date()
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const items = costs
    .filter((c) => typeof c.dueDay === 'number' && c.dueDay >= 1 && c.dueDay <= 28)
    .map((c) => {
      const d = c.dueDay as number
      const next = new Date(now.getFullYear(), now.getMonth() + (now.getDate() <= d ? 0 : 1), d)
      const days = Math.round((next.getTime() - todayMid.getTime()) / 86400000)
      return { c, next, days }
    })
    .sort((a, b) => a.next.getTime() - b.next.getTime())
    .slice(0, 6)

  return (
    <DashboardCard title="Aankomende betalingen" icon={CalendarClock} iconClassName="text-sky-500">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nog geen vaste lasten met een afschrijfdag. Stel bij een vaste last een &ldquo;dag van de
          maand&rdquo; in om hier je betalingen te zien aankomen.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-cardborder">
          {items.map(({ c, next, days }) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50 dark:bg-white/5">
                <span className="flex flex-col items-center leading-none">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">{MONTHS[next.getMonth()]}</span>
                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{next.getDate()}</span>
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{c.name}</p>
                <p className="text-[11px] text-slate-400">
                  {days <= 0 ? 'vandaag' : days === 1 ? 'morgen' : `over ${days} dagen`}
                </p>
              </div>
              {days <= 3 && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
              <span className="shrink-0 text-sm font-bold text-slate-800 dark:text-slate-100">€{euro(c.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}
