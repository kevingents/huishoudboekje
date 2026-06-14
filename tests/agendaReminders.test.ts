import { describe, it, expect } from 'vitest'
import { eventStartInstant, shouldFireReminder, reminderBody } from '@/lib/agendaReminders'

const MIN = 60_000

describe('eventStartInstant (NL-wandkloktijd → UTC, DST-bewust)', () => {
  it('rekent zomertijd (CEST, +2) goed om', () => {
    // 15 juni 14:00 NL = 12:00 UTC
    expect(eventStartInstant('2026-06-15', '14:00')).toBe(Date.UTC(2026, 5, 15, 12, 0, 0))
  })
  it('rekent wintertijd (CET, +1) goed om', () => {
    // 15 januari 14:00 NL = 13:00 UTC
    expect(eventStartInstant('2026-01-15', '14:00')).toBe(Date.UTC(2026, 0, 15, 13, 0, 0))
  })
  it('zonder tijd: behandelt als 08:00 (ochtend)', () => {
    // 15 juni, geen tijd → 08:00 CEST = 06:00 UTC
    expect(eventStartInstant('2026-06-15', '')).toBe(Date.UTC(2026, 5, 15, 6, 0, 0))
  })
  it('geeft NaN bij een ongeldige datum', () => {
    expect(Number.isNaN(eventStartInstant('rommel', '14:00'))).toBe(true)
  })
})

describe('shouldFireReminder (afgaan op de gekozen aanlooptijd)', () => {
  const start = Date.UTC(2026, 5, 15, 12, 0, 0) // referentie-start

  it('gaat af precies op het ideale moment (start − aanlooptijd)', () => {
    expect(shouldFireReminder({ startMs: start, remindMinutes: 10, nowMs: start - 10 * MIN })).toBe(true)
  })
  it('gaat nog niet af als het te vroeg is', () => {
    expect(shouldFireReminder({ startMs: start, remindMinutes: 10, nowMs: start - 20 * MIN })).toBe(false)
  })
  it('vangt een gemiste run op kort ná het ideale moment', () => {
    // 1-uur-melding, ideale moment was start−60; 5 min later draait de pinger pas.
    expect(shouldFireReminder({ startMs: start, remindMinutes: 60, nowMs: start - 55 * MIN })).toBe(true)
  })
  it('"op het moment zelf" mag tot 15 min ná de start nog (grace)', () => {
    expect(shouldFireReminder({ startMs: start, remindMinutes: 0, nowMs: start + 10 * MIN })).toBe(true)
    expect(shouldFireReminder({ startMs: start, remindMinutes: 0, nowMs: start + 20 * MIN })).toBe(false)
  })
  it('gaat niet meer af als de afspraak ruim voorbij is', () => {
    expect(shouldFireReminder({ startMs: start, remindMinutes: 10, nowMs: start + 30 * MIN })).toBe(false)
  })
  it('vuurt geen stale lange-aanloop-melding (afspraak later toegevoegd dan het lead-moment)', () => {
    // Afspraak is over ~1 dag, maar met "1 week van tevoren": dat moment is al
    // ruim voorbij → niet alsnog afvuren.
    const oneDayOut = start // start is referentie; now = 1 dag ervoor
    expect(
      shouldFireReminder({ startMs: oneDayOut, remindMinutes: 10080, nowMs: oneDayOut - 1440 * MIN }),
    ).toBe(false)
  })
  it('vuurt niet bij een ongeldige start', () => {
    expect(shouldFireReminder({ startMs: NaN, remindMinutes: 10, nowMs: start })).toBe(false)
  })
})

describe('reminderBody (menselijke meldingstekst)', () => {
  const base = { title: 'Zwemles', time: '14:00', weekday: 'ma', day: '15', month: 'juni', who: 'Pepijn' }
  it('benoemt de aanlooptijd in minuten/uren/dagen', () => {
    expect(reminderBody({ ...base, remindMinutes: 10 })).toContain('begint over 10 min')
    expect(reminderBody({ ...base, remindMinutes: 60 })).toContain('begint over 1 uur')
    expect(reminderBody({ ...base, remindMinutes: 1440 })).toContain('is morgen')
  })
  it('voegt het tijdstip en de persoon toe', () => {
    const body = reminderBody({ ...base, remindMinutes: 60 })
    expect(body).toContain('om 14:00')
    expect(body).toContain('voor Pepijn')
  })
  it('zonder tijd en lead 0: "is vandaag"', () => {
    expect(reminderBody({ ...base, time: '', who: 'Gezin', remindMinutes: 0 })).toContain('is vandaag')
  })
})
