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
  who: string
  accent: string
}

interface Feed {
  url: string
  label: string
}

/** School-/Parro-feeds krijgen een eigen kleur in de agenda. */
function isSchoolFeed(label: string): boolean {
  const l = label.toLowerCase()
  return l.includes('school') || l.includes('parro')
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
  let feeds: Feed[] = []
  try {
    const raw = (JSON.parse(integration?.config ?? '{}').urls ?? []) as unknown[]
    feeds = raw
      .map((e) =>
        typeof e === 'string'
          ? { url: e, label: 'Agenda' }
          : {
              url: String((e as { url?: unknown })?.url ?? ''),
              label: String((e as { label?: unknown })?.label || 'Agenda'),
            },
      )
      .filter((f) => f.url)
  } catch {
    feeds = []
  }

  if (feeds.length === 0) {
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

  for (const feed of feeds) {
    const who = feed.label
    const accent = isSchoolFeed(feed.label) ? 'amber' : 'sky'
    try {
      const data = await ical.async.fromURL(feed.url)
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
              who,
              accent,
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
          rows.push({
            externalId,
            dateKey: isoDate(start),
            title,
            time: timeLabel(start, ev.end, ev.datetype),
            who,
            accent,
          })
        }
      }
    } catch (e) {
      errors.push(`${feed.url}: ${String(e)}`)
    }
  }

  const upcoming = rows
    .filter((r) => r.dateKey >= todayKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, 200)

  // Alleen vervangen als het ophalen (deels) lukte. Mislukten ALLE feeds, dan de
  // bestaande afspraken NIET wissen (anders verlies je ze bij een tijdelijke fout).
  const allFailed = errors.length > 0 && upcoming.length === 0
  if (!allFailed) {
    // Items die de gebruiker zelf heeft losgekoppeld (bewerkt → source 'manual',
    // externalId behouden) of verwijderd ('ical_hidden') NIET opnieuw toevoegen,
    // anders verschijnen ze dubbel of komen verwijderde items terug.
    const [detached, hidden] = await Promise.all([
      prisma.agendaEvent.findMany({
        where: { householdId, source: { not: 'ical' }, externalId: { not: null } },
        select: { externalId: true },
      }),
      prisma.hiddenIcalEvent.findMany({ where: { householdId }, select: { externalId: true } }),
    ])
    const skip = new Set<string>([
      ...detached.map((d) => d.externalId as string),
      ...hidden.map((h) => h.externalId),
    ])

    await prisma.agendaEvent.deleteMany({ where: { householdId, source: 'ical' } })
    for (const r of upcoming) {
      if (r.externalId && skip.has(r.externalId)) continue
      const parts = describeDate(r.dateKey)
      await prisma.agendaEvent.create({
        data: {
          householdId,
          ...parts,
          title: r.title,
          time: r.time,
          who: r.who,
          accent: r.accent,
          source: 'ical',
          externalId: r.externalId,
        },
      })
    }
  }

  await prisma.integration.updateMany({
    where: { householdId, key: 'ical' },
    data: { status: 'connected' },
  })

  return { synced: upcoming.length, errors }
}
