'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Plus, Check, RefreshCw, ExternalLink } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import { useOutings } from '@/lib/hooks'
import type { NearbyPlace } from '@/lib/overpass'

const NearbyMap = dynamic(() => import('./NearbyMap'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-slate-100" />,
})

const FILTERS = [
  { key: 'alles', label: 'Alles' },
  { key: 'speeltuin', label: 'Speeltuinen' },
  { key: 'park', label: 'Parken' },
  { key: 'zwemmen', label: 'Zwemmen' },
  { key: 'dieren', label: 'Dieren' },
  { key: 'cultuur', label: 'Musea' },
  { key: 'pretpark', label: 'Pretparken' },
  { key: 'natuur', label: 'Natuur' },
  { key: 'sport', label: 'Sport' },
]
const CAT_LABEL: Record<string, string> = {
  speeltuin: 'Speeltuin', park: 'Park', zwemmen: 'Zwemmen', dieren: 'Dieren',
  cultuur: 'Cultuur', pretpark: 'Pretpark', natuur: 'Natuur', sport: 'Sport', uitstapje: 'Uitstapje',
}
const COST_LABEL: Record<string, string> = { gratis: 'Gratis', laag: '€', gemiddeld: '€€', hoog: '€€€' }

export default function NearbyExplorer() {
  const { outings, addOuting } = useOutings()
  const [cat, setCat] = useState('alles')
  const [radius, setRadius] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [home, setHome] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [places, setPlaces] = useState<NearbyPlace[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())
  const acRef = useRef<AbortController | null>(null)

  // 'added' uit de daadwerkelijk opgeslagen uitjes halen (osmId), zodat een plek
  // die je al toevoegde "Toegevoegd" blijft — ook na tab-wissel of opnieuw scannen.
  useEffect(() => {
    setAdded(new Set(outings.filter((o) => o.osmId).map((o) => o.osmId as string)))
  }, [outings])

  const scan = useCallback(async (category: string, r: number) => {
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ radius: String(r) })
      if (category !== 'alles') qs.set('categories', category)
      const res = await fetch(`/api/outings/nearby?${qs}`, { signal: ac.signal })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'mislukt')
      setHome(data.location)
      setPlaces(data.places ?? [])
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setError(e instanceof Error && e.message !== 'mislukt' ? e.message : 'Zoeken mislukt — probeer het zo nog eens.')
      setPlaces([])
    } finally {
      if (acRef.current === ac) setLoading(false)
    }
  }, [])

  useEffect(() => {
    scan('alles', 10)
    return () => acRef.current?.abort()
  }, [scan])

  const onFilter = (key: string) => {
    setCat(key)
    scan(key, radius)
  }
  const onRadius = (r: number) => {
    setRadius(r)
    scan(cat, r)
  }

  const addPlace = async (p: NearbyPlace) => {
    setAdded((s) => new Set(s).add(p.id)) // direct feedback; server dedupt op osmId
    await addOuting({
      title: p.name,
      category: p.category === 'park' || p.category === 'pretpark' ? 'uitstapje' : p.category,
      cost: p.cost ?? undefined,
      area: home?.name,
      source: 'osm',
      osmId: p.id,
    })
  }

  return (
    <DashboardCard
      title="In de buurt"
      icon={MapPin}
      iconClassName="text-brand"
      headerRight={
        <button
          type="button"
          onClick={() => scan(cat, radius)}
          disabled={loading}
          aria-label="Opnieuw zoeken"
          className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilter(f.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              cat === f.key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
        <span>Straal</span>
        {[5, 10, 20].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRadius(r)}
            className={`rounded-full px-2.5 py-1 font-semibold ${radius === r ? 'bg-brand-light text-brand' : 'hover:bg-slate-100'}`}
          >
            {r} km
          </button>
        ))}
        {home && <span className="ml-auto text-slate-400">{home.name}</span>}
      </div>

      {error ? (
        <p className="text-sm text-rose-500">{error}</p>
      ) : (
        <>
          {home && <NearbyMap home={home} places={places} />}
          <p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {loading ? 'Zoeken…' : `${places.length} plekken${cat !== 'alles' ? '' : ' in de buurt'}`}
          </p>
          <ul className="flex flex-col divide-y divide-cardborder">
            {places.slice(0, 40).map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {p.name}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex text-slate-400 hover:text-brand" aria-label="Website">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {CAT_LABEL[p.category] ?? p.category} &middot; {p.distanceKm} km
                    {p.cost ? ` · ${COST_LABEL[p.cost] ?? p.cost}` : ''}
                  </p>
                </div>
                {added.has(p.id) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <Check className="h-3.5 w-3.5" /> Toegevoegd
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => addPlace(p)}
                    className="pill shrink-0 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/15"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Bij mijn uitjes
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardCard>
  )
}
