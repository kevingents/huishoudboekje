import { prisma } from './db'
import { describeDate } from './date'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function clockLabel(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function timeLabel(start: Date, end?: Date, datetype?: string) {
  if (datetype === 'date') return 'Hele dag'
  const s = clockLabel(start)
  if (end && end.getDate() === start.getDate()) {
    return `${s} – ${clockLabel(end)}`
  }
  return s
}

interface Row {
  externalId: string
  dateKey: string
  title: string
  time: string
}

/**
 * Haalt de ingestelde iCal-feeds van één huishouden op, vouwt terugkerende
 * afspraken (RRULE) uit binnen de horizon, en vervangt de gesyncte agenda-items.
 * Herbruikbaar door zowel de handmatige sync-knop als de dagelijkse cron.
 */
export async function syncHouseholdIcal(
  householdId: number,
): Promise<{ synced: number; errors: string[] }> {
  const integration = await prisma.integration.findFirst({
    where: { householdId, key: 'ical' },
  })
  let urls: string[] = []
  try {
    urls = (JSON.parse(integration?.config ?? '{}').urls ?? []).filter(Boolean)
  } catch {
    urls = []
  }

  if (urls.length === 0) {
    await prisma.agendaEvent.deleteMany({ where: { householdId, source: 'ical' } })
    await prisma.integration.updateMany({
      where: { householdId, key: 'ical' },
      data: { status: 'disconnected' },
    })
    return { synced: 0, errors: [] }
  }

  const now = new Date()
  const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const todayKey = isoDate(now)

  const seen = new Set<string>()
  const rows: Row[] = []
  const errors: string[] = []

  // Lazy import zodat node-ical niet tijdens Next's build wordt geladen.
  const ical = (await import('node-ical')).default

  for (const url of urls) {
    try {
      const data = await ical.async.fromURL(url)
      for (const key of Object.keys(data)) {
        const ev = data[key] as {
          type?: string
          start?: Date
          end?: Date
          datetype?: string
          uid?: string
          summary?: string
          rrule?: { between: (a: Date, b: Date, inc?: boolean) => Date[] }
          exdate?: Record<string, Date>
        }
        if (ev?.type !== 'VEVENT' || !ev.start) continue
        const title = String(ev.summary ?? 'Afspraak')
        const uid = ev.uid ?? key

        if (ev.rrule) {
          // Terugkerende afspraak: occurrences binnen de horizon uitvouwen.
          const excluded = new Set(
            ev.exdate ? Object.values(ev.exdate).map((d) => isoDate(d as Date)) : [],
          )
          let occurrences: Date[] = []
          try {
            occurrences = ev.rrule.between(now, horizon, true).slice(0, 60)
          } catch {
            occurrences = []
          }
          for (const occ of occurrences) {
            const dateKey = isoDate(occ)
            if (excluded.has(dateKey)) continue
            const externalId = `ical:${uid}:${dateKey}`
            if (seen.has(externalId)) continue
            seen.add(externalId)
            rows.push({
              externalId,
              dateKey,
              title,
              time: ev.datetype === 'date' ? 'Hele dag' : clockLabel(ev.start),
            })
          }
        } else {
          // Losse afspraak.
          const start = ev.start
          if (start < now && ev.datetype !== 'date') continue
          if (start > horizon) continue
          const externalId = `ical:${uid}`
          if (seen.has(externalId)) continue
          seen.add(externalId)
          rows.push({ externalId, dateKey: isoDate(start), title, time: timeLabel(start, ev.end, ev.datetype) })
        }
      }
    } catch (e) {
      errors.push(`${url}: ${String(e)}`)
    }
  }

  const upcoming = rows
    .filter((r) => r.dateKey >= todayKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, 200)

  // Vervang de bestaande gesyncte items van dit huishouden.
  await prisma.agendaEvent.deleteMany({ where: { householdId, source: 'ical' } })
  for (const r of upcoming) {
    const parts = describeDate(r.dateKey)
    await prisma.agendaEvent.create({
      data: {
        householdId,
        ...parts,
        title: r.title,
        time: r.time,
        who: 'Agenda',
        accent: 'sky',
        source: 'ical',
        externalId: r.externalId,
      },
    })
  }

  await prisma.integration.updateMany({
    where: { householdId, key: 'ical' },
    data: { status: 'connected' },
  })

  return { synced: upcoming.length, errors }
}
