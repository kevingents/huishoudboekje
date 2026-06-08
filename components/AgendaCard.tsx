import { CalendarDays, ChevronRight } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { appointments } from '@/lib/mockData'

export default function AgendaCard() {
  return (
    <DashboardCard title="Komende afspraken" icon={CalendarDays} iconClassName="text-violet-500">
      <ul className="flex flex-col">
        {appointments.map((appointment, index) => (
          <li key={`${appointment.title}-${index}`}>
            <button className="group flex w-full items-center gap-3 rounded-2xl py-2.5 text-left transition-colors hover:bg-slate-50">
              {/* Date badge */}
              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <span className="text-base font-bold leading-none">{appointment.day}</span>
                <span className="text-[10px] font-semibold uppercase">{appointment.month}</span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-slate-800 line-clamp-2">
                  {appointment.title}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {appointment.date} · {appointment.time}
                </span>
              </span>

              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </button>

            {index < appointments.length - 1 && <hr className="border-cardborder" />}
          </li>
        ))}
      </ul>

      <button className="pill mt-3 text-violet-600 hover:text-violet-700">
        Bekijk volledige agenda
        <ChevronRight className="h-4 w-4" />
      </button>
    </DashboardCard>
  )
}
