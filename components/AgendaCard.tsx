'use client'

import Link from 'next/link'
import { CalendarDays, ChevronRight } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useAgenda } from '@/lib/hooks'

function todayKey(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function AgendaCard() {
  const { events, isLoading } = useAgenda()
  // Alleen de komende afspraken (vanaf vandaag), op datum.
  const tk = todayKey()
  const upcoming = events.filter((e) => e.dateKey >= tk).slice(0, 3)

  return (
    <DashboardCard title="Komende afspraken" icon={CalendarDays} iconClassName="text-violet-500">
      {isLoading && events.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-slate-500">Geen afspraken gepland.</p>
      ) : (
        <ul className="flex flex-col">
          {upcoming.map((event, index) => (
            <li key={event.id}>
              <Link
                href="/agenda"
                className="group flex w-full items-center gap-3 rounded-2xl py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <span className="text-base font-bold leading-none">{event.day}</span>
                  <span className="text-[10px] font-semibold uppercase">{event.month}</span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-slate-800 line-clamp-2">
                    {event.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {event.weekday} · {event.time}
                  </span>
                </span>

                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </Link>

              {index < upcoming.length - 1 && <hr className="border-cardborder" />}
            </li>
          ))}
        </ul>
      )}

      <Link href="/agenda" className="pill mt-3 text-violet-600 hover:text-violet-700">
        Bekijk volledige agenda
        <ChevronRight className="h-4 w-4" />
      </Link>
    </DashboardCard>
  )
}
