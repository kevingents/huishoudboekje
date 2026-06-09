import { prisma } from '@/lib/db'
import { describeDate } from '@/lib/date'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function timeLabel(ev: { start: Date; end?: Date; datetype?: string }) {
  if (ev.datetype === 'date') return 'Hele dag'
  const start = `${pad(ev.start.getHours())}:${pad(ev.start.getMinutes())}`
  if (ev.end && ev.end.getDate() === ev.start.getDate()) {
    return `${start} – ${pad(ev.end.getHours())}:${pad(ev.end.getMinutes())}`
  }
  return start
}

/** Haalt de ingestelde iCal-feeds van dit huishouden op en vervangt de gesyncte items. */
export async function POST() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const integration = await prisma.integration.findFirst({ where: { householdId: hid, key: 'ical' } })
  let urls: string[] = []
  try {
    urls = (JSON.parse(integration?.config ?? '{}').urls ?? []).filter(Boolean)
  } catch {
    urls = []
  }

  if (urls.length === 0) {
    await prisma.agendaEvent.deleteMany({ where: { householdId: hid, source: 'ical' } })
    await prisma.integration.updateMany({ where: { householdId: hid, key: 'ical' }, data: { status: 'disconnected' } })
    return Response.json({ synced: 0, message: 'Geen iCal-URL ingesteld.' })
  }

  const now = new Date()
  const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const todayKey = isoDate(now)

  const seen = new Set<string>()
  const rows: { externalId: string; dateKey: string; title: string; time: string; accent: string }[] = []
  const errors: string[] = []

  // Lazy import zodat node-ical niet tijdens Next's build wordt geladen.
  const ical = (await import('node-ical')).default

  for (const url of urls) {
    try {
      const data = await ical.async.fromURL(url)
      for (const key of Object.keys(data)) {
        const ev = data[key] as any
        if (ev?.type !== 'VEVENT' || !ev.start) continue
        const start: Date = ev.start
        if (start < now && ev.datetype !== 'date') continue
        if (start > horizon) continue
        const externalId = `ical:${ev.uid ?? key}`
        if (seen.has(externalId)) continue
        seen.add(externalId)
        rows.push({
          externalId,
          dateKey: isoDate(start),
          title: String(ev.summary ?? 'Afspraak'),
          time: timeLabel(ev),
          accent: 'sky',
        })
      }
    } catch (e) {
      errors.push(`${url}: ${String(e)}`)
    }
  }

  const upcoming = rows
    .filter((r) => r.dateKey >= todayKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, 100)

  // Vervang de bestaande gesyncte items van dit huishouden.
  await prisma.agendaEvent.deleteMany({ where: { householdId: hid, source: 'ical' } })
  for (const r of upcoming) {
    const parts = describeDate(r.dateKey)
    await prisma.agendaEvent.create({
      data: { householdId: hid, ...parts, title: r.title, time: r.time, who: 'Agenda', accent: r.accent, source: 'ical', externalId: r.externalId },
    })
  }

  await prisma.integration.updateMany({
    where: { householdId: hid, key: 'ical' },
    data: { status: upcoming.length > 0 || urls.length > 0 ? 'connected' : 'disconnected' },
  })

  return Response.json({ synced: upcoming.length, errors })
}
