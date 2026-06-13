import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { findNearby, NEARBY_CATEGORIES } from '@/lib/overpass'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT = { name: 'Amsterdam', lat: 52.37, lon: 4.9 }

async function getLocation(householdId: number) {
  const row = await prisma.setting.findFirst({ where: { householdId, key: 'weatherLocation' } })
  if (row) {
    try {
      const p = JSON.parse(row.value)
      if (typeof p?.lat === 'number' && typeof p?.lon === 'number') {
        return { name: String(p.name ?? 'je omgeving'), lat: p.lat, lon: p.lon }
      }
    } catch {
      /* val terug op default */
    }
  }
  return DEFAULT
}

export async function GET(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const url = new URL(req.url)
  const catParam = url.searchParams.get('categories')
  const categories = catParam
    ? catParam.split(',').map((c) => c.trim()).filter((c) => NEARBY_CATEGORIES.includes(c))
    : undefined
  const rawRadius = Number(url.searchParams.get('radius'))
  const radiusKm = Math.max(1, Math.min(25, Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : 10))

  // Locatie-override (GPS of een ingetypte vakantieplek); anders de woonplaats.
  const qlat = Number(url.searchParams.get('lat'))
  const qlon = Number(url.searchParams.get('lon'))
  const loc =
    Number.isFinite(qlat) && Number.isFinite(qlon) && (qlat !== 0 || qlon !== 0)
      ? { name: url.searchParams.get('name') || 'Hier', lat: qlat, lon: qlon }
      : await getLocation(hid)
  try {
    const places = await findNearby(loc.lat, loc.lon, { categories, radiusKm })
    return Response.json({ location: loc, places })
  } catch (e) {
    console.error('Nearby (Overpass) fout:', e)
    return Response.json(
      { error: 'De plekken-zoekdienst (OpenStreetMap) is even niet bereikbaar. Probeer het zo nog eens.' },
      { status: 502 },
    )
  }
}
