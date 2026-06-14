import { describe, it, expect } from 'vitest'
import { periodProgress, forecastPotje, forecastPotjes, suggestShift } from '../lib/forecast'
import type { FamilyBudget } from '../lib/types'

function pot(over: Partial<FamilyBudget>): FamilyBudget {
  return { id: 1, name: 'Potje', limit: 0, spent: 0, member: null, color: 'emerald', entries: [], ...over }
}

describe('periodProgress', () => {
  it('telt de juiste dag binnen een kalendermaand', () => {
    const p = periodProgress(new Date(2026, 0, 16), 1) // 16 jan, maand van 31 dagen
    expect(p.total).toBe(31)
    expect(p.elapsed).toBe(16)
    expect(p.fraction).toBeCloseTo(16 / 31, 5)
  })

  it('klemt de voortgang binnen 1..total', () => {
    const first = periodProgress(new Date(2026, 1, 1), 1)
    expect(first.elapsed).toBe(1)
    const p = periodProgress(new Date(2026, 1, 28), 1) // feb 2026 (28 dagen)
    expect(p.elapsed).toBe(28)
    expect(p.total).toBe(28)
  })
})

describe('forecastPotje', () => {
  const now = new Date(2026, 0, 16) // dag 16 van 31 → fractie ~0.516

  it('projecteert het eind-van-periode op basis van het tempo', () => {
    const b = pot({
      limit: 600,
      entries: [
        { label: 'a', amount: 120, at: new Date(2026, 0, 5).toISOString() },
        { label: 'b', amount: 80, at: new Date(2026, 0, 12).toISOString() },
      ],
    })
    const f = forecastPotje(b, now, 1)
    expect(f.periodSpent).toBe(200)
    expect(f.count).toBe(2)
    expect(f.projected).toBeCloseTo(200 / (16 / 31), 1) // ~387
    expect(f.status).toBe('op-koers')
    expect(f.hasData).toBe(true)
  })

  it('markeert "over" als de prognose het budget ruim overschrijdt', () => {
    const b = pot({
      limit: 300,
      entries: [{ label: 'a', amount: 200, at: new Date(2026, 0, 10).toISOString() }],
    })
    const f = forecastPotje(b, now, 1)
    expect(f.projected).toBeGreaterThan(300)
    expect(f.status).toBe('over')
    expect(f.surplus).toBeLessThan(0)
  })

  it('telt alleen boekingen van de huidige periode mee', () => {
    const b = pot({
      limit: 500,
      entries: [
        { label: 'oud', amount: 400, at: new Date(2025, 11, 20).toISOString() }, // vorige periode
        { label: 'nu', amount: 50, at: new Date(2026, 0, 8).toISOString() },
      ],
    })
    const f = forecastPotje(b, now, 1)
    expect(f.periodSpent).toBe(50)
    expect(f.count).toBe(1)
  })

  it('zegt niets zinnigs (hasData=false) te vroeg in de periode', () => {
    const early = new Date(2026, 0, 2) // dag 2
    const b = pot({ limit: 300, entries: [{ label: 'a', amount: 30, at: new Date(2026, 0, 2).toISOString() }] })
    expect(forecastPotje(b, early, 1).hasData).toBe(false)
  })

  it('negeert potjes zonder budget in forecastPotjes', () => {
    const list = forecastPotjes([pot({ id: 1, limit: 0 }), pot({ id: 2, limit: 100 })], now, 1)
    expect(list.map((f) => f.id)).toEqual([2])
  })
})

describe('suggestShift', () => {
  const now = new Date(2026, 0, 16)

  it('stelt voor te schuiven van een ruim potje naar een potje dat dreigt over te gaan', () => {
    const over = pot({
      id: 1,
      name: 'Vervoer',
      limit: 300,
      entries: [{ label: 'a', amount: 200, at: new Date(2026, 0, 10).toISOString() }],
    })
    const donor = pot({
      id: 2,
      name: 'Boodschappen',
      limit: 600,
      entries: [{ label: 'b', amount: 60, at: new Date(2026, 0, 10).toISOString() }],
    })
    const s = suggestShift(forecastPotjes([over, donor], now, 1))
    expect(s).not.toBeNull()
    expect(s!.from.name).toBe('Boodschappen')
    expect(s!.to.name).toBe('Vervoer')
    expect(s!.amount % 5).toBe(0)
    expect(s!.amount).toBeGreaterThanOrEqual(5)
  })

  it('geeft null als er niets te schuiven valt', () => {
    const a = pot({ id: 1, limit: 300, entries: [{ label: 'a', amount: 20, at: new Date(2026, 0, 10).toISOString() }] })
    const b = pot({ id: 2, limit: 300, entries: [{ label: 'b', amount: 20, at: new Date(2026, 0, 10).toISOString() }] })
    expect(suggestShift(forecastPotjes([a, b], now, 1))).toBeNull()
  })
})
