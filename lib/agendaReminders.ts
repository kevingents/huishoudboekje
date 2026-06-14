import { prisma } from './db'
import { notify } from './notify'
import { eventWho } from './assignees'
import { once } from './reminderOnce'

/**
 * Tijd-gebonden agenda-herinneringen. De gebruiker kiest een aanlooptijd in
 * MINUTEN (10 min, 1 uur, 1 dag, …). Een aparte, lichte cron-endpoint draait dit
 * elke paar minuten (externe pinger), zodat ook "10 min van tevoren" precies
 * genoeg afgaat; de dagelijkse cron draait het óók als vangnet. Dubbel versturen
 * kan niet dankzij once() (unieke sleutel per afspraak + aanlooptijd).
 */

const ALLDAY_START = '08:00' // afspraak zonder tijd → behandel als 08:00 (ochtend)
const GRACE_MIN = 15 // nog sturen tot 15 min ná het ideale moment (vangt een gemiste run op)
const CATCHUP_MIN = 6 * 60 // niet meer sturen als het ideale moment >6u geleden was (geen stale/late melding)

/** Minuten dat Europe/Amsterdam vóór UTC ligt op tijdstip `at` (60 in winter, 120 in zomer). */
function nlOffsetMinutes(at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const m: Record<string, number> = {}
  for (const p of dtf.formatToParts(at)) if (p.type !== 'literal') m[p.type] = Number(p.value)
  // en-US geeft soms 24 voor middernacht; normaliseer.
  const hour = m.hour === 24 ? 0 : m.hour
  const asUTC = Date.UTC(m.year, m.month - 1, m.day, hour, m.minute, m.second)
  return Math.round((asUTC - at.getTime()) / 60000)
}

/** Epoch-ms van de start van een afspraak: NL-wandkloktijd → echt UTC-moment (DST-bewust). */
export function eventStartInstant(dateKey: string, time: string | null | undefined): number {
  const md = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateKey || '').trim())
  if (!md) return NaN
  const hhmm = /^(\d{1,2}):(\d{2})$/.test((time || '').trim()) ? (time as string).trim() : ALLDAY_START
  const [h, mi] = hhmm.split(':').map(Number)
  const guess = Date.UTC(Number(md[1]), Number(md[2]) - 1, Number(md[3]), h, mi)
  // Corrigeer met de NL-offset rond dat moment (DST-grenzen zijn voor een
  // herinnering verwaarloosbaar nauwkeurig).
  return guess - nlOffsetMinutes(new Date(guess)) * 60000
}

/**
 * Moet de herinnering NU afgaan? We zijn op/na "start − aanlooptijd", maar niet
 * te ver erna (CATCHUP) en de afspraak is nog niet ruim voorbij (GRACE).
 */
export function shouldFireReminder({
  startMs,
  remindMinutes,
  nowMs,
}: {
  startMs: number
  remindMinutes: number
  nowMs: number
}): boolean {
  if (!Number.isFinite(startMs)) return false
  const minsUntilStart = (startMs - nowMs) / 60000
  if (minsUntilStart > remindMinutes) return false // nog te vroeg voor het ideale moment
  if (remindMinutes - minsUntilStart > CATCHUP_MIN) return false // ideale moment te lang geleden (stale)
  if (minsUntilStart < -GRACE_MIN) return false // afspraak al voorbij
  return true
}

/** Korte, menselijke meldingstekst op basis van de gekozen aanlooptijd. */
export function reminderBody(ev: {
  title: string
  time: string
  weekday: string
  day: string
  month: string
  who?: string | null
  remindMinutes?: number | null
}): string {
  const rm = ev.remindMinutes ?? 0
  const at = ev.time ? ` om ${ev.time}` : ''
  const ctx = ` (${ev.weekday} ${ev.day} ${ev.month})`
  let lead: string
  if (rm <= 0) lead = ev.time ? 'begint zo' : 'is vandaag'
  else if (rm < 60) lead = `begint over ${rm} min`
  else if (rm < 1440) {
    const h = Math.round(rm / 60)
    lead = `begint over ${h} uur`
  } else {
    const d = Math.round(rm / 1440)
    lead = d === 1 ? 'is morgen' : `is over ${d} dagen`
  }
  const who = ev.who && ev.who !== 'Gezin' ? ` — voor ${ev.who}` : ''
  return `${ev.title} ${lead}${at}${ctx}${who}.`
}

/**
 * Verstuur alle agenda-herinneringen die op dit moment "rijp" zijn. Idempotent
 * via once(): meerdere triggers en gemiste runs leiden nooit tot dubbel of gemist.
 * Waaiert uit naar elke toegewezen persoon apart (leeg = hele gezin).
 */
export async function runDueAgendaReminders(nowMs: number): Promise<number> {
  // Alleen afspraken met een ingestelde herinnering en niet ruim in het verleden.
  const cutoff = new Date(nowMs - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const events = await prisma.agendaEvent.findMany({
    where: { remindMinutes: { not: null }, dateKey: { gte: cutoff } },
  })
  let sent = 0
  for (const ev of events) {
    if (ev.remindMinutes == null) continue
    const startMs = eventStartInstant(ev.dateKey, ev.time)
    if (!shouldFireReminder({ startMs, remindMinutes: ev.remindMinutes, nowMs })) continue
    const names = eventWho(ev)
    const targets = names.length ? names : [null]
    const ok = await once(ev.householdId, `agenda-remind:${ev.id}:${ev.dateKey}:${ev.remindMinutes}`, async () => {
      const title = `Herinnering: ${ev.title}`
      const body = reminderBody(ev)
      await Promise.all(
        targets.map((t) =>
          notify({ householdId: ev.householdId, type: 'agenda', title, body, targetMember: t }),
        ),
      )
    })
    if (ok) sent++
  }
  return sent
}
