'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Plus, Clock, Trash2, Link2, ChevronLeft, ChevronRight, BellRing, Pencil } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import TimeSelect from '@/components/TimeSelect'
import { useAgenda, useFamily, useCoParent, useAuth } from '@/lib/hooks'
import { eventWho, displayNames, serializeNames } from '@/lib/assignees'
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

const chipCls = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
    on
      ? 'bg-brand text-white'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'
  }`

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
  const { events, isLoading, addEvent, updateEvent, removeEvent } = useAgenda()
  const { members } = useFamily()
  const { user } = useAuth()
  const { linked: coLinked } = useCoParent()
  const myName = members.find((m) => m.id === user?.memberId)?.name ?? null
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{
    date: string
    title: string
    time: string
    whoNames: string[]
    accent: string
    coShared: boolean
    remind: boolean
    remindLead: string
  }>({ date: '', title: '', time: '', whoNames: [], accent: 'sky', coShared: false, remind: false, remindLead: '60' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingDetach, setEditingDetach] = useState(false)
  const [customWho, setCustomWho] = useState('')

  const days = useMemo(() => groupByDate(events), [events])
  const todayKey = localKey(new Date())
  const tomorrowKey = localKey(new Date(Date.now() + 86_400_000))

  // Lijst- of maandweergave
  const [view, setView] = useState<'lijst' | 'maand'>('lijst')
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedKey, setSelectedKey] = useState(todayKey)
  const shiftMonth = (delta: number) =>
    setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  const eventsByKey = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>()
    for (const e of events) {
      const l = m.get(e.dateKey) ?? []
      l.push(e)
      m.set(e.dateKey, l)
    }
    return m
  }, [events])

  const monthGrid = useMemo(() => {
    const y = monthCursor.getFullYear()
    const mo = monthCursor.getMonth()
    const lead = (new Date(y, mo, 1).getDay() + 6) % 7 // maandag = 0
    const dim = new Date(y, mo + 1, 0).getDate()
    const cells: { key: string; day: number; inMonth: boolean }[] = []
    for (let i = lead; i > 0; i--) {
      const d = new Date(y, mo, 1 - i)
      cells.push({ key: localKey(d), day: d.getDate(), inMonth: false })
    }
    for (let d = 1; d <= dim; d++) {
      cells.push({ key: localKey(new Date(y, mo, d)), day: d, inMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const [yy, mm, dd] = cells[cells.length - 1].key.split('-').map(Number)
      const nd = new Date(yy, mm - 1, dd + 1)
      cells.push({ key: localKey(nd), day: nd.getDate(), inMonth: false })
    }
    return cells
  }, [monthCursor])

  const monthTitle = monthCursor.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
  const selectedEvents = eventsByKey.get(selectedKey) ?? []
  const sel = describeKey(selectedKey, todayKey, tomorrowKey)

  // Vanuit het "+"-snelmenu geopend met ?nieuw=1 → meteen de modal tonen.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('nieuw')) setOpen(true)
  }, [])

  const resetForm = () => {
    setForm({ date: '', title: '', time: '', whoNames: [], accent: 'sky', coShared: false, remind: false, remindLead: '60' })
    setCustomWho('')
    setEditingId(null)
    setEditingDetach(false)
  }

  const toggleWho = (name: string) =>
    setForm((f) => ({
      ...f,
      whoNames: f.whoNames.includes(name) ? f.whoNames.filter((n) => n !== name) : [...f.whoNames, name],
    }))

  const openAdd = () => {
    resetForm()
    setOpen(true)
  }

  /** Bewerk een bestaande afspraak (ook een gesynct iCal-item; dat wordt dan
   *  losgekoppeld als je eigen afspraak). Co-ouder-afspraken zijn read-only. */
  const openEdit = (event: (typeof events)[number]) => {
    const names = eventWho(event)
    const memberNames = members.map((m) => m.name)
    const picked = names.filter((n) => memberNames.includes(n))
    const custom = names.filter((n) => !memberNames.includes(n))
    setForm({
      date: event.dateKey,
      title: event.title,
      time: event.time ?? '',
      whoNames: picked,
      accent: event.accent ?? 'sky',
      coShared: Boolean((event as { coShared?: boolean }).coShared),
      remind: event.remindMinutes != null,
      remindLead: event.remindMinutes != null ? String(event.remindMinutes) : '60',
    })
    setCustomWho(custom.join(', '))
    setEditingId(event.id)
    setEditingDetach(event.source === 'ical')
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    const names = [...form.whoNames]
    // customWho mag meerdere namen bevatten (komma-gescheiden), bv. "Oma, Opa".
    for (const c of customWho.split(',').map((s) => s.trim()).filter(Boolean)) names.push(c)
    const who = displayNames(names)
    const whoList = serializeNames(names)
    const { remind, remindLead, whoNames, ...rest } = form
    const payload = { ...rest, who, whoList, remindMinutes: remind ? Number(remindLead) : null }
    if (editingId !== null) await updateEvent(editingId, payload)
    else await addEvent(payload)
    resetForm()
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
            onClick={openAdd}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Nieuwe afspraak
          </button>
        }
      />

      {/* Lijst / Maand */}
      <div className="mb-5 flex w-full max-w-xs rounded-full border border-cardborder bg-white p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setView('lijst')}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            view === 'lijst' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Lijst
        </button>
        <button
          type="button"
          onClick={() => setView('maand')}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            view === 'maand' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Maand
        </button>
      </div>

      {view === 'maand' ? (
        <div className="flex flex-col gap-4">
          <DashboardCard>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Vorige maand"
                className="grid h-9 w-9 place-items-center rounded-full border border-cardborder text-slate-500 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-base font-bold capitalize text-slate-800">{monthTitle}</p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Volgende maand"
                className="grid h-9 w-9 place-items-center rounded-full border border-cardborder text-slate-500 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-400">
              {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((cell) => {
                const dayEvents = eventsByKey.get(cell.key) ?? []
                const isToday = cell.key === todayKey
                const selected = cell.key === selectedKey
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedKey(cell.key)}
                    className={`flex min-h-[3.2rem] flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors ${
                      selected ? 'bg-brand-light ring-1 ring-brand/30' : 'hover:bg-slate-50'
                    } ${cell.inMonth ? '' : 'opacity-40'}`}
                  >
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        isToday ? 'bg-brand text-white' : 'text-slate-700'
                      }`}
                    >
                      {cell.day}
                    </span>
                    <span className="flex h-1.5 items-center gap-0.5">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <span
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${(accentClasses[e.accent] ?? accentClasses.sky).dot}`}
                        />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          </DashboardCard>

          <DashboardCard title={`${sel.label} · ${sel.day} ${sel.monthShort}`}>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-slate-500">Geen afspraken op deze dag.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {selectedEvents.map((event) => {
                  const accent = accentClasses[event.accent] ?? accentClasses.sky
                  const readOnly = event.source === 'coparent' // alleen co-ouder is echt read-only
                  return (
                    <li key={event.id} className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-slate-50">
                      <span className={`h-10 w-1.5 shrink-0 rounded-full ${accent.bar}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{event.title}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {event.time || 'Hele dag'}
                        </p>
                      </div>
                      <span title={event.who} className={`pill min-w-0 max-w-[45%] truncate px-2.5 py-1 text-xs font-semibold ${accent.badge}`}>
                        {event.who}
                      </span>
                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(event)}
                            aria-label={`${event.title} bewerken`}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 opacity-100 transition-all hover:bg-slate-100 hover:text-brand sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEvent(event.id)}
                            aria-label={`${event.title} verwijderen`}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 opacity-100 transition-all hover:bg-rose-50 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </DashboardCard>
        </div>
      ) : isLoading && events.length === 0 ? (
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
                    const external = event.source !== 'manual'
                    const extLabel = event.source === 'coparent' ? 'Andere ouder' : 'Gekoppeld'
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
                            {external && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                <Link2 className="h-2.5 w-2.5" />
                                {extLabel}
                              </span>
                            )}
                          </p>
                        </div>
                        <span title={event.who} className={`pill min-w-0 max-w-[45%] truncate px-2.5 py-1 text-xs font-semibold ${accent.badge}`}>
                          {event.who}
                        </span>
                        {event.source !== 'coparent' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(event)}
                              aria-label={`${event.title} bewerken`}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 opacity-100 transition-all hover:bg-slate-100 hover:text-brand sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEvent(event.id)}
                              aria-label={`${event.title} verwijderen`}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 opacity-100 transition-all hover:bg-rose-50 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
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

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingId(null)
        }}
        title={editingId !== null ? 'Afspraak bewerken' : 'Nieuwe afspraak'}
      >
        <form onSubmit={submit} className="flex flex-col gap-3">
          {editingDetach && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              Dit is een gekoppelde (gesynchroniseerde) afspraak. Als je 'm opslaat wordt het je eigen
              afspraak — toekomstige updates uit de agenda-koppeling overschrijven 'm dan niet meer.
            </p>
          )}
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Datum
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <div className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Tijd
              <TimeSelect value={form.time} onChange={(v) => setForm({ ...form, time: v })} selectClass={inputClass} />
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Voor wie
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {myName && (
                <button type="button" onClick={() => toggleWho(myName)} className={chipCls(form.whoNames.includes(myName))}>
                  Mijzelf
                </button>
              )}
              {members
                .filter((m) => m.name !== myName)
                .map((m) => (
                  <button key={m.id} type="button" onClick={() => toggleWho(m.name)} className={chipCls(form.whoNames.includes(m.name))}>
                    {m.name}
                  </button>
                ))}
            </div>
            <input
              value={customWho}
              onChange={(e) => setCustomWho(e.target.value)}
              placeholder="Iemand anders (bijv. Oma)"
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1 font-normal text-[11px] text-slate-400">
              {form.whoNames.length === 0 && !customWho.trim()
                ? 'Niemand gekozen = het hele gezin.'
                : `Voor ${displayNames([...form.whoNames, ...(customWho.trim() ? [customWho.trim()] : [])])}.`}
            </p>
          </div>
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
                    form.accent === accent ? 'ring-2 ring-slate-400 ring-offset-2 dark:ring-offset-slate-800' : '',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
          {coLinked && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.coShared}
                onChange={(e) => setForm({ ...form, coShared: e.target.checked })}
                className="h-4 w-4 accent-brand"
              />
              Delen met de andere ouder
            </label>
          )}

          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.remind}
                onChange={(e) => setForm({ ...form, remind: e.target.checked })}
                className="h-4 w-4 accent-brand"
              />
              <BellRing className="h-4 w-4 text-amber-500" />
              Herinner mij met een melding
            </label>
            {form.remind && (
              <label className="mt-2 block text-xs font-semibold text-slate-500">
                Wanneer
                <select
                  value={form.remindLead}
                  onChange={(e) => setForm({ ...form, remindLead: e.target.value })}
                  className={`mt-1 ${inputClass}`}
                >
                  <option value="0">Op het moment zelf</option>
                  <option value="10">10 minuten van tevoren</option>
                  <option value="30">30 minuten van tevoren</option>
                  <option value="60">1 uur van tevoren</option>
                  <option value="120">2 uur van tevoren</option>
                  <option value="1440">1 dag van tevoren</option>
                  <option value="2880">2 dagen van tevoren</option>
                  <option value="10080">1 week van tevoren</option>
                </select>
                <span className="mt-1 block text-[11px] font-normal text-slate-400">
                  {form.time
                    ? `De melding komt ${form.remindLead === '0' ? 'op het tijdstip van de afspraak' : 'die tijd vóór de afspraak'}`
                    : 'Zonder tijd komt de melding ’s ochtends'}{' '}
                  — naar{' '}
                  {form.whoNames.length === 0 && !customWho.trim()
                    ? 'het hele gezin'
                    : displayNames([...form.whoNames, ...(customWho.trim() ? [customWho.trim()] : [])])}
                  .
                </span>
              </label>
            )}
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
