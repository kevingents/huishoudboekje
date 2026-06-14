'use client'

import { useState } from 'react'
import { Users2, CalendarRange, Link2, Copy, Check, Unlink } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useSettings, useCoParent } from '@/lib/hooks'
import { readCoParenting, coParentNow, type CoParenting } from '@/lib/coparent'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function CoParentCard() {
  const { settings, setSetting } = useSettings()
  const cp = readCoParenting(settings.coParenting)
  const [names, setNames] = useState({ parentA: cp.parentA ?? '', parentB: cp.parentB ?? '' })
  const co = useCoParent()
  const [copied, setCopied] = useState(false)
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
    parentA: names.parentA,
    parentB: names.parentB,
    evenWeekParent: cp.evenWeekParent ?? 'A',
  }
  const now = coParentNow(base, new Date())

  return (
    <DashboardCard title="Co-ouderschap" icon={Users2} iconClassName="text-violet-500">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Om-en-om weekschema</p>
          <p className="text-xs text-slate-500">Voor gescheiden ouders: bij wie zijn de kinderen deze week.</p>
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
          <label className="mt-3 block text-xs font-semibold text-slate-500">
            Even weken bij
            <select
              value={cp.evenWeekParent ?? 'A'}
              onChange={(e) => save({ ...base, evenWeekParent: e.target.value as 'A' | 'B' })}
              className={`mt-1 ${inputClass}`}
            >
              <option value="A">{names.parentA || 'Ouder A'}</option>
              <option value="B">{names.parentB || 'Ouder B'}</option>
            </select>
          </label>

          {now && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700">
              <CalendarRange className="h-4 w-4" />
              Deze week bij {now.parent}
            </p>
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
            <p className="text-sm font-semibold text-slate-800">Gekoppeld met {co.linkedName}</p>
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
          <p className="text-sm font-semibold text-slate-800">Koppel de andere ouder</p>
          <p className="mb-2 text-xs text-slate-500">
            Deel deze link met de andere ouder. Als die ingelogd is en de link opent, worden jullie
            agenda&apos;s gekoppeld.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
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
