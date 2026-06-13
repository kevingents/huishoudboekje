'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, Navigation, Check } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useSettings, useGeolocation } from '@/lib/hooks'
import type { GeoResult } from '@/lib/geocode'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function LocationCard() {
  const { settings, setSetting } = useSettings()
  const geo = useGeolocation(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const wantGps = useRef(false)

  const current = (settings.weatherLocation as { name?: string } | undefined)?.name ?? 'Amsterdam'

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim().length < 2) return
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setResults(data.results ?? [])
      if ((data.results ?? []).length === 0) setMsg('Geen plaats gevonden — probeer een andere spelling.')
    } catch {
      setMsg('Zoeken lukt even niet.')
    } finally {
      setLoading(false)
    }
  }

  const choose = async (r: GeoResult) => {
    await setSetting('weatherLocation', { name: r.name, lat: r.lat, lon: r.lon })
    setResults([])
    setQuery('')
    setMsg(`Locatie ingesteld op ${r.name}.`)
  }

  // Na het toestaan van GPS de locatie opslaan (alleen als de knop is gebruikt).
  useEffect(() => {
    if (wantGps.current && geo.coords) {
      wantGps.current = false
      setSetting('weatherLocation', { name: 'Mijn locatie', lat: geo.coords.lat, lon: geo.coords.lon })
      setMsg('Locatie ingesteld op je huidige plek.')
    }
  }, [geo.coords, setSetting])

  return (
    <DashboardCard title="Locatie" icon={MapPin} iconClassName="text-rose-500">
      <p className="text-sm text-slate-500">
        Je woonplaats bepaalt het weer en de uitjes in de buurt. Vul je stad in of gebruik je huidige
        locatie.
      </p>
      <p className="mt-2 text-sm">
        Nu ingesteld: <span className="font-semibold text-slate-800 dark:text-slate-100">{current}</span>
      </p>

      <form onSubmit={search} className="mt-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Bijv. Utrecht, Groningen, Maastricht"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="pill shrink-0 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {loading ? 'Zoeken…' : 'Zoek'}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="mt-2 flex flex-col divide-y divide-cardborder rounded-2xl border border-cardborder">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                onClick={() => choose(r)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{r.name}</span>
                  {(r.admin || r.country) && (
                    <span className="text-slate-400"> · {[r.admin, r.country].filter(Boolean).join(', ')}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => {
          wantGps.current = true
          geo.request()
        }}
        className="pill mt-3 border border-cardborder bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Navigation className={`h-4 w-4 ${geo.status === 'loading' ? 'animate-pulse' : ''}`} />
        Gebruik mijn huidige locatie
      </button>
      {geo.status === 'denied' && (
        <p className="mt-1.5 text-[11px] text-slate-400">Locatietoegang geweigerd — sta het toe in je browser/telefoon.</p>
      )}

      {msg && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          {msg}
        </p>
      )}
    </DashboardCard>
  )
}
