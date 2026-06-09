'use client'

import { useMemo, useState } from 'react'
import { Calendar, Plus, Clock, Trash2, Link2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import { useAgenda } from '@/lib/hooks'
import type { AgendaEvent } from '@/lib/types'

const accentClasses: Record<string, { badge: string; dot: string; bar: string }> = {
  sky: { badge: 'bg-sky-100 text-sky-600', dot: 'bg-sky-400', bar: 'bg-sky-400' },
  violet: { badge: 'bg-violet-100 text-violet-600', dot: 'bg-violet-400', bar: 'bg-violet-400' },
  emerald: { badge: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-400', bar: 'bg-emerald-400' },
  amber: { badge: 'bg-amber-100 text-amber-600', dot: 'bg-amber-400', bar: 'bg-amber-400' },
  rose: { badge: 'bg-rose-100 text-rose-600', dot: 'bg-rose-400', bar: 'bg-rose-400' },
}
const accentOptions = Object.keys(accentClasses)

const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const WEEKDAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Beschrijft een dateKey (yyyy-mm-dd) robuust, met een relatief label. */
function describeKey(key: string, todayKey: string, tomorrowKey: string) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1)
  const weekday = WEEKDAYS[date.getDay()]
  const isToday = key === todayKey
  const label = isToday ? 'Vandaag' : key === tomorrowKey ? 'Morgen' : weekday
  return { day: d || '', monthShort: MONTHS_SHORT[(m || 1) - 1] ?? '', weekday, label, isToday }
}

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

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
  const { events, isLoading, addEvent, removeEvent } = useAgenda()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ date: '', title: '', time: '', who: 'Gezin', accent: 'sky' })

  const days = useMemo(() => groupByDate(events), [events])
  const todayKey = localKey(new Date())
  const tomorrowKey = localKey(new Date(Date.now() + 86_400_000))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    await addEvent(form)
    setForm({ date: '', title: '', time: '', who: 'Gezin', accent: 'sky' })
    setOpen(false)
  }

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
            onClick={() => setOpen(true)}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Nieuwe afspraak
          </button>
        }
      />

      {isLoading && events.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : days.length === 0 ? (
        <DashboardCard>
          <p className="text-sm text-slate-500">Nog geen afspraken. Voeg er een toe.</p>
        </DashboardCard>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((dayEvents) => {
            const key = dayEvents[0].dateKey
            const { day, monthShort, weekday, label, isToday } = describeKey(key, todayKey, tomorrowKey)
            const isRelative = label !== weekday
            return (
              <DashboardCard key={key} className={isToday ? 'ring-2 ring-brand/30' : ''}>
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ${
                      isToday ? 'bg-brand text-white shadow-sm shadow-brand/30' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="text-xl font-extrabold leading-none">{day}</span>
                    <span className="text-[10px] font-semibold uppercase opacity-80">{monthShort}</span>
                  </span>
                  <div>
                    <p className="text-base font-bold text-slate-800">{label}</p>
                    <p className="text-sm text-slate-500">
                      {isRelative && `${weekday} · `}
                      {dayEvents.length} {dayEvents.length === 1 ? 'afspraak' : 'afspraken'}
                    </p>
                  </div>
                </div>

                <ul className="flex flex-col gap-1">
                  {dayEvents.map((event) => {
                    const accent = accentClasses[event.accent] ?? accentClasses.sky
                    const fromIcal = event.source === 'ical'
                    return (
                      <li
                        key={event.id}
                        className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-slate-50"
                      >
                        <span className={`h-10 w-1.5 shrink-0 rounded-full ${accent.bar}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{event.title}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {event.time || 'Hele dag'}
                            {fromIcal && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                <Link2 className="h-2.5 w-2.5" />
                                Gekoppeld
                              </span>
                            )}
                          </p>
                        </div>
                        <span className={`pill shrink-0 px-2.5 py-1 text-xs font-semibold ${accent.badge}`}>
                          {event.who}
                        </span>
                        {!fromIcal && (
                          <button
                            type="button"
                            onClick={() => removeEvent(event.id)}
                            aria-label={`${event.title} verwijderen`}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </DashboardCard>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nieuwe afspraak">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Titel
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Bijv. Zwemles Tom"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Datum
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Tijd
              <input
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="Bijv. 16:00"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-500">
            Voor wie
            <input
              value={form.who}
              onChange={(e) => setForm({ ...form, who: e.target.value })}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="text-xs font-semibold text-slate-500">
            Kleur
            <div className="mt-1.5 flex gap-2">
              {accentOptions.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  onClick={() => setForm({ ...form, accent })}
                  aria-label={accent}
                  className={[
                    'h-8 w-8 rounded-full transition-all',
                    accentClasses[accent].dot,
                    form.accent === accent ? 'ring-2 ring-slate-400 ring-offset-2' : '',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Afspraak opslaan
          </button>
        </form>
      </Modal>
    </>
  )
}
