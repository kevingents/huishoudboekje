'use client'

import { useEffect, useState } from 'react'
import { Users2, CalendarRange, Link2, Copy, Check, Unlink, ArrowLeftRight } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useSettings, useCoParent } from '@/lib/hooks'
import {
  readCoParenting,
  coParentToday,
  coParentWeek,
  scheduleDays,
  presetSchedule,
  type CoParenting,
  type DayAssign,
} from '@/lib/coparent'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

// Weergavevolgorde ma…zo, met de bijbehorende JS getDay()-index.
const EDIT_DAYS: { l: string; i: number }[] = [
  { l: 'Ma', i: 1 },
  { l: 'Di', i: 2 },
  { l: 'Wo', i: 3 },
  { l: 'Do', i: 4 },
  { l: 'Vr', i: 5 },
  { l: 'Za', i: 6 },
  { l: 'Zo', i: 0 },
]

const cycle = (v: DayAssign): DayAssign => (v === 'A' ? 'B' : v === 'B' ? 'wissel' : 'A')

export default function CoParentCard() {
  const { settings, setSetting } = useSettings()
  const cp = readCoParenting(settings.coParenting)
  const [names, setNames] = useState({ parentA: cp.parentA ?? '', parentB: cp.parentB ?? '' })
  const co = useCoParent()
  const [copied, setCopied] = useState(false)
  // Datum pas na mount (geen hydratie-mismatch).
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])
  // Naam-inputs in sync houden met opgeslagen settings (SWR laadt async; anders
  // blijft de lokale state leeg en zou een save de namen overschrijven).
  useEffect(() => setNames({ parentA: cp.parentA ?? '', parentB: cp.parentB ?? '' }), [cp.parentA, cp.parentB])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(co.link)
      setCopied(true)
    } catch {
      /* clipboard niet beschikbaar */
    }
  }

  const save = (next: CoParenting) => setSetting('coParenting', next)
  const base: CoParenting = {
    enabled: cp.enabled ?? false,
    // Nooit een opgeslagen naam met lege state overschrijven (bv. een per-dag-save
    // vlak na het laden, vóór de naam-sync): val terug op de opgeslagen waarde.
    parentA: names.parentA || cp.parentA || '',
    parentB: names.parentB || cp.parentB || '',
    evenWeekParent: cp.evenWeekParent ?? 'A',
    days: scheduleDays(cp),
  }

  const setDay = (getDayIdx: number) => {
    const days = scheduleDays(cp)
    days[getDayIdx] = cycle(days[getDayIdx])
    save({ ...base, days })
  }

  const initial = (which: 'A' | 'B') =>
    (which === 'A' ? names.parentA : names.parentB).trim().charAt(0).toUpperCase() || which
  const assignStyle = (v: DayAssign) =>
    v === 'A'
      ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
      : v === 'B'
        ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
        : 'bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-300'

  const today = now ? coParentToday(base, now) : null
  const week = now ? coParentWeek(base, now) : []
  const days = scheduleDays(cp)

  return (
    <DashboardCard title="Co-ouderschap" icon={Users2} iconClassName="text-violet-500">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Aanpasbaar zorgschema</p>
          <p className="text-xs text-slate-500">
            Voor gescheiden ouders: stel per dag in bij wie de kinderen zijn — van week-om-week tot alleen de weekenden.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!cp.enabled}
          onClick={() => save({ ...base, enabled: !cp.enabled })}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${cp.enabled ? 'bg-brand' : 'bg-slate-200'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${cp.enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {cp.enabled && (
        <>
          <hr className="my-4 border-cardborder" />
          <div className="flex gap-3">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Ouder A
              <input
                value={names.parentA}
                onChange={(e) => setNames({ ...names, parentA: e.target.value })}
                onBlur={() => save({ ...base, parentA: names.parentA })}
                placeholder="Bijv. Papa"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
              Ouder B
              <input
                value={names.parentB}
                onChange={(e) => setNames({ ...names, parentB: e.target.value })}
                onBlur={() => save({ ...base, parentB: names.parentB })}
                placeholder="Bijv. Mama"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>

          {/* Snelkeuze */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => save({ ...base, days: presetSchedule('om-en-om') })}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
            >
              Om-en-om week
            </button>
            <button
              type="button"
              onClick={() => save({ ...base, days: presetSchedule('weekend') })}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
            >
              Weekenden om-en-om
            </button>
          </div>

          {/* Per dag instellen (tik om te wisselen A → B → ↔) */}
          <div className="mt-3 grid grid-cols-7 gap-1">
            {EDIT_DAYS.map((d) => {
              const v = days[d.i]
              return (
                <button
                  key={d.l}
                  type="button"
                  onClick={() => setDay(d.i)}
                  className="flex flex-col items-center gap-1"
                  aria-label={`${d.l}: ${v === 'wissel' ? 'wisselt' : v === 'A' ? names.parentA || 'Ouder A' : names.parentB || 'Ouder B'}`}
                >
                  <span className="text-[10px] font-semibold text-slate-400">{d.l}</span>
                  <span className={`grid h-8 w-full place-items-center rounded-lg text-xs font-bold ${assignStyle(v)}`}>
                    {v === 'wissel' ? <ArrowLeftRight className="h-3.5 w-3.5" /> : initial(v)}
                  </span>
                </button>
              )
            })}
          </div>

          <label className="mt-3 block text-xs font-semibold text-slate-500">
            Wisseldagen in even weken bij
            <select
              value={cp.evenWeekParent ?? 'A'}
              onChange={(e) => save({ ...base, evenWeekParent: e.target.value as 'A' | 'B' })}
              className={`mt-1 ${inputClass}`}
            >
              <option value="A">{names.parentA || 'Ouder A'}</option>
              <option value="B">{names.parentB || 'Ouder B'}</option>
            </select>
          </label>

          {/* Weekoverzicht (resultaat) */}
          {week.length > 0 && (
            <>
              {today && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  <CalendarRange className="h-4 w-4" />
                  Vandaag bij {today.parent}
                </p>
              )}
              <div className="mt-2 grid grid-cols-7 gap-1">
                {week.map((d) => (
                  <div
                    key={`${d.label}-${d.dayNum}`}
                    className={`flex flex-col items-center rounded-lg px-1 py-1.5 ${
                      d.which === 'A'
                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                        : 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                    } ${d.isToday ? 'ring-2 ring-brand' : ''}`}
                  >
                    <span className="text-[10px] font-semibold">{d.label}</span>
                    <span className="truncate text-[9px]">{d.parent.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <hr className="my-4 border-cardborder" />
      {co.linked ? (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
            <Link2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Gekoppeld met {co.linkedName}</p>
            <p className="text-xs text-slate-500">Gedeelde afspraken zie je in beide agenda&apos;s.</p>
          </div>
          <button
            type="button"
            onClick={() => co.unlink()}
            className="pill shrink-0 border border-cardborder bg-white px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50"
          >
            <Unlink className="h-4 w-4" />
            Ontkoppelen
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Koppel de andere ouder</p>
          <p className="mb-2 text-xs text-slate-500">
            Deel deze link met de andere ouder. Als die ingelogd is en de link opent, worden jullie agenda&apos;s
            gekoppeld.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-white/5">
            <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{co.link || '…'}</span>
            <button
              type="button"
              onClick={copy}
              className="pill shrink-0 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-cardborder hover:bg-slate-100"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Gekopieerd' : 'Kopieer'}
            </button>
          </div>
        </div>
      )}
    </DashboardCard>
  )
}
