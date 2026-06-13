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
  const radiusKm = Number(url.searchParams.get('radius')) || 10

  const loc = await getLocation(hid)
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
