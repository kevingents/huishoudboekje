import { prisma } from '@/lib/db'
import { describeWeatherCode, weekdayName, isWet } from '@/lib/weather'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Location {
  name: string
  lat: number
  lon: number
}

const DEFAULT_LOCATION: Location = { name: 'Amsterdam', lat: 52.37, lon: 4.9 }

async function getLocation(householdId: number): Promise<Location> {
  const row = await prisma.setting.findFirst({ where: { householdId, key: 'weatherLocation' } })
  if (!row) return DEFAULT_LOCATION
  try {
    const parsed = JSON.parse(row.value)
    if (parsed?.lat && parsed?.lon) return parsed
  } catch {
    /* val terug op default */
  }
  return DEFAULT_LOCATION
}

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const location = await getLocation(hid)
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
    `&current=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=1&timezone=auto`

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const data = await res.json()

    const code: number = data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? 0
    const { condition, icon } = describeWeatherCode(code)

    return Response.json({
      location: location.name,
      day: weekdayName(new Date()),
      temp: Math.round(data.current?.temperature_2m ?? 0),
      high: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      low: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
      code,
      condition,
      icon,
      wet: isWet(code),
    })
  } catch (e) {
    return Response.json({ error: 'Weer kon niet worden opgehaald', detail: String(e) }, { status: 502 })
  }
}
