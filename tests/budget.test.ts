import { describe, it, expect } from 'vitest'
import {
  periodKeyOf,
  txPeriodKey,
  shiftPeriodKey,
  periodRangeOf,
  merchantKey,
  isSpendingCategory,
  monthlyEquivalent,
} from '@/lib/budget'

describe('periodKeyOf', () => {
  it('kalendermaand (startDay 1) = jaar-maand van de datum', () => {
    expect(periodKeyOf('2026-06-15', 1)).toBe('2026-06')
    expect(periodKeyOf('2026-01-01', 1)).toBe('2026-01')
  })
  it('startDag > 1: datum vóór de startdag hoort bij de vorige maand', () => {
    expect(periodKeyOf('2026-06-20', 15)).toBe('2026-06') // op/na de 15e
    expect(periodKeyOf('2026-06-15', 15)).toBe('2026-06') // exact de startdag
    expect(periodKeyOf('2026-06-14', 15)).toBe('2026-05') // vóór de 15e
  })
  it('jaarwissel-veilig', () => {
    expect(periodKeyOf('2026-01-10', 15)).toBe('2025-12')
  })
  it('ongeldige invoer geeft null', () => {
    expect(periodKeyOf('', 1)).toBeNull()
    expect(periodKeyOf(null, 1)).toBeNull()
  })
})

describe('txPeriodKey (sentinel-datum → createdAt fallback)', () => {
  it('gebruikt de ISO-datum als die er is', () => {
    expect(txPeriodKey({ date: '2026-05-20', createdAt: '2026-06-01T10:00:00Z' }, 1)).toBe('2026-05')
  })
  it('valt terug op createdAt bij "Vandaag"/leeg (echte "nu"-posten)', () => {
    expect(txPeriodKey({ date: 'Vandaag', createdAt: '2026-06-13T10:00:00Z' }, 1)).toBe('2026-06')
    expect(txPeriodKey({ date: '', createdAt: '2026-04-02T10:00:00Z' }, 1)).toBe('2026-04')
  })
  it('deelt "Geïmporteerd" (geen echte datum) NIET in op import-tijd', () => {
    expect(txPeriodKey({ date: 'Geïmporteerd', createdAt: '2026-04-02T10:00:00Z' }, 1)).toBeNull()
  })
  it('accepteert een Date-object voor createdAt (server/Prisma)', () => {
    expect(txPeriodKey({ date: 'Vandaag', createdAt: new Date('2026-03-10T09:00:00Z') }, 1)).toBe('2026-03')
  })
  it('null als er niets bruikbaars is', () => {
    expect(txPeriodKey({ date: 'Vandaag' }, 1)).toBeNull()
  })
})

describe('shiftPeriodKey', () => {
  it('verschuift maanden, jaarwissel-veilig', () => {
    expect(shiftPeriodKey('2026-06', -1)).toBe('2026-05')
    expect(shiftPeriodKey('2026-01', -1)).toBe('2025-12')
    expect(shiftPeriodKey('2026-12', 1)).toBe('2027-01')
    expect(shiftPeriodKey('2026-06', -6)).toBe('2025-12')
  })
})

describe('periodRangeOf', () => {
  it('kalendermaand', () => {
    const r = periodRangeOf(new Date(2026, 5, 15), 1) // juni 2026
    expect(r.start).toEqual(new Date(2026, 5, 1))
    expect(r.end).toEqual(new Date(2026, 6, 0)) // 30 juni
  })
  it('periode van de 15e t/m de 14e', () => {
    const r = periodRangeOf(new Date(2026, 5, 20), 15)
    expect(r.start).toEqual(new Date(2026, 5, 15))
    expect(r.end).toEqual(new Date(2026, 6, 14))
  })
  it('klemt de startdag op 1..28', () => {
    const r = periodRangeOf(new Date(2026, 5, 20), 99)
    expect(r.start.getDate()).toBe(28)
  })
})

describe('merchantKey', () => {
  it('normaliseert ruis en NR-referenties weg', () => {
    expect(merchantKey('Albert Heijn 1234 NR:AB12CD')).toContain('albert heijn')
    expect(merchantKey('ALBERT HEIJN')).toBe(merchantKey('albert heijn'))
  })
  it('dedupliceert herhaalde woorden', () => {
    expect(merchantKey('Shell Shell tankstation')).not.toContain('shell shell')
  })
})

describe('isSpendingCategory', () => {
  it('sluit gereserveerde categorieën uit', () => {
    expect(isSpendingCategory('Boodschappen')).toBe(true)
    expect(isSpendingCategory('Inkomsten')).toBe(false)
    expect(isSpendingCategory('Vaste lasten')).toBe(false)
    expect(isSpendingCategory('Negeren')).toBe(false)
    expect(isSpendingCategory('Aflossingen')).toBe(false)
  })
})

describe('monthlyEquivalent', () => {
  it('rekent jaarbedragen om naar maand', () => {
    expect(monthlyEquivalent(120, '12 months')).toBeCloseTo(10)
    expect(monthlyEquivalent(50, '1 month')).toBeCloseTo(50)
  })
})
