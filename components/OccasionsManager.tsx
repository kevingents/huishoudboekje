'use client'

import { useState } from 'react'
import { CalendarClock, Gift, Plus, Trash2 } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useSettings } from '@/lib/hooks'
import { BUILTIN_OCCASIONS, parseBirthday, shortDate, type OccasionConfig, type CustomOccasion } from '@/lib/occasions'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const chip = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
    on
      ? 'bg-brand text-white'
      : 'bg-slate-100 text-slate-400 line-through hover:bg-slate-200 dark:bg-white/10 dark:text-slate-500 dark:hover:bg-white/15'
  }`

/** Beheer van feestdagen/gelegenheden voor de "Binnenkort"-kaart: standaarddagen
 *  aan/uit zetten en eigen gelegenheden (bijv. een trouwdag) toevoegen/verwijderen.
 *  Opgeslagen in de instellingen-store (settings.occasions), niet hardcoded. */
export default function OccasionsManager({ className = '' }: { className?: string }) {
  const { settings, setSetting } = useSettings()
  const config = (settings.occasions ?? {}) as OccasionConfig
  const hidden = config.hidden ?? []
  const custom = config.custom ?? []

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [gift, setGift] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const save = (next: OccasionConfig) => setSetting('occasions', next)

  const toggleBuiltin = (name: string) => {
    const isHidden = hidden.some((h) => h.toLowerCase() === name.toLowerCase())
    const nextHidden = isHidden ? hidden.filter((h) => h.toLowerCase() !== name.toLowerCase()) : [...hidden, name]
    save({ ...config, hidden: nextHidden })
  }

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    const parsed = parseBirthday(date)
    if (!parsed) {
      setError('Vul een geldige datum in, bijv. "21 juni" of "21-6".')
      return
    }
    const item: CustomOccasion = { id: `occ-${Date.now()}`, title: t, month: parsed.month, day: parsed.day, gift }
    save({ ...config, custom: [...custom, item] })
    setTitle('')
    setDate('')
    setGift(true)
    setError(null)
  }

  const removeCustom = (id: string) => save({ ...config, custom: custom.filter((c) => c.id !== id) })

  return (
    <DashboardCard title="Gelegenheden" icon={CalendarClock} iconClassName="text-amber-500" className={className}>
      <p className="text-sm text-slate-500">
        Welke feest-/cadeaudagen wil je in de gaten houden? Tik een dag aan/uit, of voeg een eigen gelegenheid toe
        (bijv. een trouwdag). Ze verschijnen in de <span className="font-semibold">Binnenkort</span>-kaart en als seintje.
      </p>

      {/* Standaarddagen aan/uit */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {BUILTIN_OCCASIONS.map((o) => {
          const on = !hidden.some((h) => h.toLowerCase() === o.name.toLowerCase())
          return (
            <button key={o.name} type="button" onClick={() => toggleBuiltin(o.name)} className={chip(on)} aria-pressed={on}>
              {o.name}
            </button>
          )
        })}
      </div>

      {/* Eigen gelegenheden */}
      {custom.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {custom.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                <Gift className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                {c.title} <span className="text-slate-400">· {shortDate(c.day, c.month)}</span>
              </span>
              <button
                type="button"
                onClick={() => removeCustom(c.id)}
                aria-label={`${c.title} verwijderen`}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Toevoegen */}
      <form onSubmit={addCustom} className="mt-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Naam, bijv. Trouwdag"
            className={`min-w-0 flex-1 ${inputClass}`}
          />
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="21 juni"
            className={`w-28 shrink-0 ${inputClass}`}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} className="h-4 w-4 rounded border-cardborder text-brand focus:ring-brand/30" />
            Cadeaudag (eerder seintje)
          </label>
          <button type="submit" className="pill shrink-0 bg-brand px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-dark">
            <Plus className="h-3.5 w-3.5" />
            Toevoegen
          </button>
        </div>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </form>
    </DashboardCard>
  )
}
