// Plaatsnaam → coördinaten via de gratis Open-Meteo geocoding-API (geen key).
// Gebruikt om een ingetypte woonplaats/vakantieplek om te zetten naar lat/lon.

export interface GeoResult {
  name: string
  lat: number
  lon: number
  admin?: string // provincie/regio
  country?: string
}

export async function geocode(query: string, limit = 5): Promise<GeoResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
    `&count=${Math.min(10, limit)}&language=nl&format=json`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), next: { revalidate: 86400 } })
  if (!res.ok) throw new Error(`Geocoding ${res.status}`)
  const data = (await res.json()) as {
    results?: { name: string; latitude: number; longitude: number; admin1?: string; country?: string }[]
  }
  return (data.results ?? [])
    .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .map((r) => ({ name: r.name, lat: r.latitude, lon: r.longitude, admin: r.admin1, country: r.country }))
}
