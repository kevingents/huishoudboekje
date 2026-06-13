'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { NearbyPlace } from '@/lib/overpass'

const CAT_COLOR: Record<string, string> = {
  speeltuin: '#d97706',
  park: '#16a34a',
  zwemmen: '#0284c7',
  dieren: '#ea580c',
  cultuur: '#7c3aed',
  pretpark: '#db2777',
  natuur: '#15803d',
  sport: '#e11d48',
  uitstapje: '#475569',
}

export default function NearbyMap({
  home,
  places,
}: {
  home: { lat: number; lon: number; name: string }
  places: NearbyPlace[]
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView([home.lat, home.lon], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [home.lat, home.lon])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    L.circleMarker([home.lat, home.lon], {
      radius: 8,
      color: '#fff',
      weight: 2,
      fillColor: '#35B558',
      fillOpacity: 1,
    })
      .bindPopup(`<b>${home.name}</b><br/>jullie omgeving`)
      .addTo(layer)

    const pts: [number, number][] = [[home.lat, home.lon]]
    for (const p of places) {
      pts.push([p.lat, p.lon])
      L.circleMarker([p.lat, p.lon], {
        radius: 6,
        color: '#fff',
        weight: 1.5,
        fillColor: CAT_COLOR[p.category] ?? CAT_COLOR.uitstapje,
        fillOpacity: 0.95,
      })
        .bindPopup(`<b>${p.name}</b><br/>${p.category} &middot; ${p.distanceKm} km`)
        .addTo(layer)
    }
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts).pad(0.15))
    }
  }, [places, home.lat, home.lon, home.name])

  return <div ref={elRef} className="h-72 w-full overflow-hidden rounded-2xl border border-cardborder" />
}
