import { describe, it, expect } from 'vitest'
import { normalizeItemKey, memberInsights, hasMemberPotjes } from '../lib/spendingInsights'
import type { FamilyBudget } from '../lib/types'

function pot(over: Partial<FamilyBudget>): FamilyBudget {
  return { id: 1, name: 'Potje', limit: 0, spent: 0, member: null, color: 'emerald', entries: [], ...over }
}
const e = (label: string, amount: number, at: Date) => ({ label, amount, at: at.toISOString() })

describe('normalizeItemKey', () => {
  it('vouwt schrijfwijzen en accenten samen', () => {
    expect(normalizeItemKey('Gezichtscreme')).toBe('gezichtscreme')
    expect(normalizeItemKey('gezichts creme')).toBe('gezichts creme')
    expect(normalizeItemKey('Crème de la')).toBe('creme de la')
  })
  it('strip losse bedragen/getallen', () => {
    expect(normalizeItemKey('Gezichtscreme 12,95')).toBe('gezichtscreme')
  })
})

describe('memberInsights', () => {
  const now = new Date(2026, 0, 16) // periode jan 2026 (startdag 1)

  it('groepeert per lid en telt hoe vaak iets gekocht is deze periode', () => {
    const marielle = pot({
      id: 1,
      name: 'Marielle',
      member: 'Marielle',
      entries: [
        e('Gezichtscreme', 15, new Date(2026, 0, 3)),
        e('gezichtscreme', 15, new Date(2026, 0, 10)),
        e('Gezichtscreme', 15, new Date(2026, 0, 14)),
        e('Shampoo', 6, new Date(2026, 0, 12)),
      ],
    })
    const kevin = pot({ id: 2, name: 'Kevin', member: 'Kevin', entries: [e('Lunch werk', 9, new Date(2026, 0, 9))] })

    const res = memberInsights([marielle, kevin], now, 1)
    const m = res.find((r) => r.member === 'Marielle')!
    expect(m).toBeTruthy()
    const creme = m.items.find((i) => i.label === 'Gezichtscreme')!
    expect(creme.periodCount).toBe(3) // 3× gezichtscreme deze periode
    expect(creme.total).toBe(45)
    expect(m.items[0].label).toBe('Gezichtscreme') // meeste boekingen → bovenaan
    expect(res.map((r) => r.member)).toContain('Kevin')
  })

  it('telt alleen deze periode voor periodCount, maar count over alles', () => {
    const b = pot({
      member: 'Marielle',
      entries: [
        e('Gezichtscreme', 15, new Date(2025, 11, 20)), // vorige periode
        e('Gezichtscreme', 15, new Date(2026, 0, 5)),
      ],
    })
    const item = memberInsights([b], now, 1)[0].items[0]
    expect(item.count).toBe(2)
    expect(item.periodCount).toBe(1)
    expect(item.total).toBe(30)
  })

  it('rekent een gemiddelde frequentie per maand uit over de gedekte maanden', () => {
    const b = pot({
      member: 'Marielle',
      entries: [
        e('Gezichtscreme', 15, new Date(2025, 10, 5)), // nov
        e('Gezichtscreme', 15, new Date(2025, 11, 5)), // dec
        e('Gezichtscreme', 15, new Date(2026, 0, 5)), // jan
      ],
    })
    const item = memberInsights([b], now, 1)[0].items[0]
    expect(item.count).toBe(3)
    expect(item.perMonth).toBeCloseTo(1, 5) // 3 boekingen over 3 maanden
  })

  it('telt boekingen tot en met de laatste dag, niet de eerste dag erna', () => {
    const b = pot({
      member: 'Marielle',
      entries: [
        e('Gezichtscreme', 15, new Date(2026, 0, 31, 23, 30)),
        e('Gezichtscreme', 15, new Date(2026, 1, 1, 0, 30)),
      ],
    })
    const item = memberInsights([b], now, 1)[0].items[0]
    expect(item.count).toBe(2) // beide all-time
    expect(item.periodCount).toBe(1) // alleen de laatste dag van de periode
  })

  it('negeert potjes zonder lid of zonder boekingen', () => {
    const shared = pot({ id: 1, name: 'Boodschappen', member: null, entries: [e('AH', 40, now)] })
    const emptyMember = pot({ id: 2, name: 'Pepijn', member: 'Pepijn', entries: [] })
    expect(memberInsights([shared, emptyMember], now, 1)).toEqual([])
  })
})

describe('hasMemberPotjes', () => {
  it('is waar zodra één potje aan een lid hangt', () => {
    expect(hasMemberPotjes([pot({ member: null }), pot({ member: 'Kevin' })])).toBe(true)
    expect(hasMemberPotjes([pot({ member: null }), pot({ member: '  ' })])).toBe(false)
  })
})
