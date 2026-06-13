// Echte plekken "in de buurt" via OpenStreetMap (Overpass API) — gratis, geen
// key. Levert speeltuinen, parken, zwemplekken, dieren, cultuur, natuur, sport.

export interface NearbyPlace {
  id: string
  name: string
  category: string // speeltuin | park | zwemmen | dieren | cultuur | pretpark | natuur | sport | uitstapje
  lat: number
  lon: number
  distanceKm: number
  cost: string | null // gratis | laag | gemiddeld | hoog
  url: string | null
}

// Onze categorieën → OpenStreetMap-tagfilters.
const FILTERS: Record<string, string[]> = {
  speeltuin: ['["leisure"="playground"]'],
  park: ['["leisure"="park"]', '["leisure"="garden"]'],
  zwemmen: ['["leisure"="swimming_pool"]', '["leisure"="water_park"]', '["natural"="beach"]'],
  dieren: ['["tourism"="zoo"]', '["tourism"="aquarium"]'],
  cultuur: ['["tourism"="museum"]', '["tourism"="gallery"]'],
  pretpark: ['["tourism"="theme_park"]'],
  natuur: ['["leisure"="nature_reserve"]', '["boundary"="national_park"]'],
  sport: ['["leisure"="sports_centre"]', '["leisure"="ice_rink"]'],
}
export const NEARBY_CATEGORIES = Object.keys(FILTERS)

type Tags = Record<string, string>

function categoryOf(t: Tags): string {
  if (t.leisure === 'playground') return 'speeltuin'
  if (t.tourism === 'zoo' || t.tourism === 'aquarium') return 'dieren'
  if (t.tourism === 'museum' || t.tourism === 'gallery') return 'cultuur'
  if (t.tourism === 'theme_park') return 'pretpark'
  if (t.leisure === 'swimming_pool' || t.leisure === 'water_park' || t.natural === 'beach') return 'zwemmen'
  if (t.leisure === 'nature_reserve' || t.boundary === 'national_park') return 'natuur'
  if (t.leisure === 'sports_centre' || t.leisure === 'ice_rink') return 'sport'
  if (t.leisure === 'park' || t.leisure === 'garden') return 'park'
  return 'uitstapje'
}

const FREE_BY_DEFAULT = new Set(['speeltuin', 'park', 'natuur'])
function costOf(category: string, t: Tags): string | null {
  if (t.fee === 'no' || t.access === 'yes') return 'gratis'
  if (t.fee === 'yes') return category === 'cultuur' || category === 'pretpark' || category === 'dieren' ? 'gemiddeld' : 'laag'
  if (FREE_BY_DEFAULT.has(category)) return 'gratis'
  if (category === 'zwemmen' || category === 'sport') return 'laag'
  if (category === 'dieren' || category === 'pretpark') return 'hoog'
  if (category === 'cultuur') return 'gemiddeld'
  return null
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Zoek plekken rond (lat, lon) binnen `radiusKm`, optioneel beperkt tot categorieën. */
export async function findNearby(
  lat: number,
  lon: number,
  opts: { categories?: string[]; radiusKm?: number; limit?: number } = {},
): Promise<NearbyPlace[]> {
  const radius = Math.round(Math.min(25, Math.max(1, opts.radiusKm ?? 10)) * 1000)
  const cats = (opts.categories?.length ? opts.categories : NEARBY_CATEGORIES).filter((c) => FILTERS[c])
  const limit = Math.min(200, opts.limit ?? 120)

  const clauses = cats
    .flatMap((c) => FILTERS[c])
    .map((f) => `nwr${f}(around:${radius},${lat},${lon});`)
    .join('')
  const query = `[out:json][timeout:25];(${clauses});out center tags ${limit};`

  // De publieke Overpass-servers zijn vaak druk (504); probeer een paar mirrors.
  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ]
  let data: { elements?: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Tags }[] } | null = null
  let lastErr: unknown = null
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Fam-gezinsapp/1.0 (huishoudboekje)' },
        body: 'data=' + encodeURIComponent(query),
        next: { revalidate: 3600 },
      })
      if (!res.ok) {
        lastErr = new Error(`Overpass ${res.status}`)
        continue
      }
      data = await res.json()
      break
    } catch (e) {
      lastErr = e
    }
  }
  if (!data) throw lastErr ?? new Error('Overpass onbereikbaar')

  const out: NearbyPlace[] = []
  const seen = new Set<string>()
  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {}
    const category = categoryOf(tags)
    // Speeltuinen zijn in OSM vaak naamloos — die tonen we toch ("Speeltuin"),
    // want het doel is álle speeltuinen op de kaart. Overige naamloze plekken niet.
    const name = tags.name ?? (category === 'speeltuin' ? 'Speeltuin' : null)
    if (!name) continue
    const plat = el.lat ?? el.center?.lat
    const plon = el.lon ?? el.center?.lon
    if (plat == null || plon == null) continue
    const key = `${el.type}/${el.id}` // op OSM-id dedupen (naamloze speeltuinen niet samenvouwen)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: `${el.type}/${el.id}`,
      name,
      category,
      lat: plat,
      lon: plon,
      distanceKm: Math.round(haversineKm(lat, lon, plat, plon) * 10) / 10,
      cost: costOf(category, tags),
      url: tags.website || tags['contact:website'] || null,
    })
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit)
}
