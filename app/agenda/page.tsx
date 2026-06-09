import { Calendar, Plus, Clock, ChevronRight } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import { agendaEvents, type AgendaEvent } from '@/lib/mockData'

/** Map an accent token to concrete Tailwind classes (kept static for purging). */
const accentClasses: Record<string, { badge: string; dot: string }> = {
  sky: { badge: 'bg-sky-100 text-sky-600', dot: 'bg-sky-400' },
  violet: { badge: 'bg-violet-100 text-violet-600', dot: 'bg-violet-400' },
  emerald: { badge: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-400' },
  amber: { badge: 'bg-amber-100 text-amber-600', dot: 'bg-amber-400' },
  rose: { badge: 'bg-rose-100 text-rose-600', dot: 'bg-rose-400' },
}

function groupByDate(events: AgendaEvent[]) {
  const groups = new Map<string, AgendaEvent[]>()
  for (const event of events) {
    const list = groups.get(event.dateKey) ?? []
    list.push(event)
    groups.set(event.dateKey, list)
  }
  return [...groups.values()]
}

export default function AgendaPage() {
  const days = groupByDate(agendaEvents)

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="De komende afspraken van het gezin"
        icon={Calendar}
        iconClassName="bg-violet-100 text-violet-500"
        actions={
          <button
            type="button"
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Nieuwe afspraak
          </button>
        }
      />

      <div className="flex flex-col gap-5">
        {days.map((events) => {
          const first = events[0]
          return (
            <DashboardCard key={first.dateKey}>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <span className="text-base font-bold leading-none">{first.day}</span>
                  <span className="text-[10px] font-semibold uppercase">{first.month}</span>
                </span>
                <div>
                  <p className="text-base font-bold text-slate-800">{first.weekday}</p>
                  <p className="text-sm text-slate-500">
                    {events.length} {events.length === 1 ? 'afspraak' : 'afspraken'}
                  </p>
                </div>
              </div>

              <ul className="flex flex-col">
                {events.map((event, index) => {
                  const accent = accentClasses[event.accent] ?? accentClasses.sky
                  return (
                    <li key={event.id}>
                      <button className="group flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-slate-50">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent.dot}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-800">
                            {event.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5" /> {event.time}
                          </span>
                        </span>
                        <span
                          className={`pill px-2.5 py-1 text-xs font-semibold ${accent.badge}`}
                        >
                          {event.who}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </button>
                      {index < events.length - 1 && <hr className="border-cardborder" />}
                    </li>
                  )
                })}
              </ul>
            </DashboardCard>
          )
        })}
      </div>
    </>
  )
}
