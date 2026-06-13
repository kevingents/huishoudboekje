import { describe, it, expect } from 'vitest'
import {
  occasionsForYear,
  dueOccasionReminders,
  occasionMessage,
  parseBirthday,
  dueBirthdayReminder,
  birthdayMessage,
  bandFor,
  upcomingOccasions,
} from '@/lib/occasions'

// Cron draait 08:00 UTC; we toetsen met een vaste tijd om DST-ruis te vermijden.
const at = (iso: string) => new Date(`${iso}T08:00:00Z`)

describe('nthSunday via occasionsForYear', () => {
  it('Moederdag = 2e zondag van mei, Vaderdag = 3e zondag van juni', () => {
    const o2026 = occasionsForYear(2026)
    expect(o2026.find((o) => o.name === 'Moederdag')).toMatchObject({ month: 5, day: 10 })
    expect(o2026.find((o) => o.name === 'Vaderdag')).toMatchObject({ month: 6, day: 21 })
  })
  it('klopt ook voor andere jaren', () => {
    expect(occasionsForYear(2025).find((o) => o.name === 'Vaderdag')).toMatchObject({ day: 15 })
    expect(occasionsForYear(2027).find((o) => o.name === 'Moederdag')).toMatchObject({ day: 9 })
  })
  it('elke gelegenheid draagt zijn eigen jaar', () => {
    expect(occasionsForYear(2031).every((o) => o.year === 2031)).toBe(true)
  })
})

describe('bandFor', () => {
  it('geeft de strakste bereikte drempel, of null als te vroeg', () => {
    expect(bandFor([10, 3, 0], 12)).toBeNull()
    expect(bandFor([10, 3, 0], 10)).toBe(10)
    expect(bandFor([10, 3, 0], 8)).toBe(10) // catch-up: zelfde band
    expect(bandFor([10, 3, 0], 3)).toBe(3)
    expect(bandFor([10, 3, 0], 1)).toBe(3)
    expect(bandFor([10, 3, 0], 0)).toBe(0)
  })
  it('één band per drempel over een hele aanloop → geen spam', () => {
    const bands: number[] = []
    for (let d = 12; d >= 0; d--) {
      const b = bandFor([10, 3, 0], d)
      if (b !== null) bands.push(b)
    }
    expect([...new Set(bands)]).toEqual([10, 3, 0]) // precies 3 unieke meldingen
  })
})

describe('dueOccasionReminders', () => {
  it('Vaderdag 2026 seint op 10/3/0 dagen', () => {
    expect(dueOccasionReminders(at('2026-06-11')).find((r) => r.name === 'Vaderdag')?.band).toBe(10)
    expect(dueOccasionReminders(at('2026-06-18')).find((r) => r.name === 'Vaderdag')?.band).toBe(3)
    expect(dueOccasionReminders(at('2026-06-21')).find((r) => r.name === 'Vaderdag')?.daysUntil).toBe(0)
    // Vóór het 10-dagenvenster (12 dagen ervoor) vuurt er nog niets.
    expect(dueOccasionReminders(at('2026-06-09')).find((r) => r.name === 'Vaderdag')).toBeUndefined()
    // Binnen het venster maar tussen drempels (8 dagen) blijft band 10 actief
    // (catch-up); de cron-dedup zorgt dat het maar één keer daadwerkelijk afgaat.
    expect(dueOccasionReminders(at('2026-06-13')).find((r) => r.name === 'Vaderdag')?.band).toBe(10)
  })
  it('geen dubbele entries rond de jaarwisseling', () => {
    const r = dueOccasionReminders(at('2026-12-31'))
    const names = r.map((x) => x.name)
    expect(new Set(names).size).toBe(names.length)
  })
  it('Sinterklaas seint vooruit met het juiste jaar in de reminder', () => {
    const r = dueOccasionReminders(at('2026-11-25')).find((x) => x.name === 'Sinterklaas')
    expect(r).toMatchObject({ year: 2026, daysUntil: 10, band: 10 })
  })
})

describe('upcomingOccasions (dashboard)', () => {
  it('toont alleen gelegenheden binnen het venster, gesorteerd, zonder duplicaten', () => {
    const up = upcomingOccasions(at('2026-06-13'), 21)
    expect(up.find((o) => o.name === 'Vaderdag')).toMatchObject({ daysUntil: 8 })
    // sortering oplopend op nabijheid
    expect(up.map((o) => o.daysUntil)).toEqual([...up.map((o) => o.daysUntil)].sort((a, b) => a - b))
    // geen dubbele namen
    const names = up.map((o) => o.name)
    expect(new Set(names).size).toBe(names.length)
  })
  it('leeg als er niets binnen het venster valt', () => {
    expect(upcomingOccasions(at('2026-03-20'), 14)).toEqual([])
  })
})

describe('occasionMessage', () => {
  it('cadeaudag vermeldt een cadeautip', () => {
    const msg = occasionMessage({ name: 'Vaderdag', day: 21, month: 6, year: 2026, daysUntil: 10, gift: true, band: 10 })
    expect(msg.body).toContain('cadeautje')
  })
  it('dag zelf is een felicitatie', () => {
    const msg = occasionMessage({ name: 'Vaderdag', day: 21, month: 6, year: 2026, daysUntil: 0, gift: true, band: 0 })
    expect(msg.title).toContain('vandaag')
  })
})

describe('parseBirthday', () => {
  it('volledige en korte maandnamen', () => {
    expect(parseBirthday('12 april')).toEqual({ month: 4, day: 12 })
    expect(parseBirthday('7 mrt')).toEqual({ month: 3, day: 7 })
    expect(parseBirthday('5 mei')).toEqual({ month: 5, day: 5 })
  })
  it('onderscheidt juni en juli (beide "ju…")', () => {
    expect(parseBirthday('3 juni')).toEqual({ month: 6, day: 3 })
    expect(parseBirthday('3 juli')).toEqual({ month: 7, day: 3 })
    expect(parseBirthday('1 jun')).toEqual({ month: 6, day: 1 })
    expect(parseBirthday('1 jul')).toEqual({ month: 7, day: 1 })
  })
  it('numerieke notaties dd-mm', () => {
    expect(parseBirthday('12-4')).toEqual({ month: 4, day: 12 })
    expect(parseBirthday('3/11')).toEqual({ month: 11, day: 3 })
    expect(parseBirthday('3.6')).toEqual({ month: 6, day: 3 })
  })
  it('weigert dubbelzinnige of ongeldige invoer', () => {
    expect(parseBirthday('10 ju')).toBeNull() // ambigu: juni/juli
    expect(parseBirthday('')).toBeNull()
    expect(parseBirthday('geen datum')).toBeNull()
    expect(parseBirthday('40 mei')).toBeNull()
  })
})

describe('dueBirthdayReminder', () => {
  it('seint 7/1/0 dagen vooraf', () => {
    expect(dueBirthdayReminder(at('2026-06-13'), 'Sanne', '20 juni')?.daysUntil).toBe(7)
    expect(dueBirthdayReminder(at('2026-06-19'), 'Sanne', '20 juni')?.daysUntil).toBe(1)
    expect(dueBirthdayReminder(at('2026-06-20'), 'Sanne', '20 juni')?.daysUntil).toBe(0)
    expect(dueBirthdayReminder(at('2026-06-12'), 'Sanne', '20 juni')).toBeNull()
  })
  it('rolt over de jaargrens naar de volgende verjaardag', () => {
    const r = dueBirthdayReminder(at('2026-12-30'), 'Tom', '5 januari')
    expect(r).toMatchObject({ year: 2027, daysUntil: 6, band: 7 })
  })
  it('niet-parseerbare verjaardag geeft null', () => {
    expect(dueBirthdayReminder(at('2026-06-13'), 'X', 'binnenkort')).toBeNull()
  })
})

describe('birthdayMessage', () => {
  it('felicitatie op de dag zelf', () => {
    expect(birthdayMessage({ name: 'Sanne', day: 20, month: 6, year: 2026, daysUntil: 0, band: 0 }).title).toContain('jarig')
  })
})
