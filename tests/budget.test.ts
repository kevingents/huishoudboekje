import { describe, it, expect } from 'vitest'
import {
  periodKeyOf,
  txPeriodKey,
  shiftPeriodKey,
  periodRangeOf,
  merchantKey,
  isSpendingCategory,
  monthlyEquivalent,
  goalReservePerMonth,
  savingsReservePerMonth,
  allocateBudget,
  loanIsActive,
  labelMatchesPattern,
  suggestLineCategory,
} from '@/lib/budget'

describe('suggestLineCategory (bonpost → categorie-suggestie)', () => {
  it('herkent gangbare posten zoals de gebruiker ze indeelt', () => {
    expect(suggestLineCategory('Koptelefoon')).toBe('Elektronica')
    expect(suggestLineCategory('Wc-papier 8 rollen')).toBe('Boodschappen')
    expect(suggestLineCategory('Watjes')).toBe('Verzorging')
    expect(suggestLineCategory('Afwasmiddel')).toBe('Huishouden')
  })
  it('leeg bij onbekend, zodat de gebruiker zelf kiest', () => {
    expect(suggestLineCategory('Onbekend ding')).toBe('')
    expect(suggestLineCategory('')).toBe('')
  })
})

describe('labelMatchesPattern (vaste last herkennen bij import)', () => {
  it('matcht een bankregel op de naam van een handmatige vaste last', () => {
    expect(labelMatchesPattern('SEPA INCASSO VATTENFALL KLANTENSERVICE', 'Vattenfall')).toBe(true)
    expect(labelMatchesPattern('/TRTP/SEPA/NAME/ABN AMRO HYPOTHEEK', 'hypotheek')).toBe(true)
    expect(labelMatchesPattern('BEA, APPLE PAY ALBERT HEIJN 1353', 'Vattenfall')).toBe(false)
  })
  it('negeert te korte/generieke patronen', () => {
    expect(labelMatchesPattern('VVE BIJDRAGE', 'vv')).toBe(false) // < 3 tekens
  })
})

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

describe('goalReservePerMonth', () => {
  const now = new Date(2026, 5, 14) // 14 juni 2026

  it('verdeelt het restbedrag over de maanden tot de streefdatum', () => {
    expect(goalReservePerMonth({ target: 1200, saved: 0, targetDate: '2026-12-14' }, now)).toBe(200) // 6 mnd
  })
  it('houdt rekening met wat al gespaard is', () => {
    expect(goalReservePerMonth({ target: 1200, saved: 600, targetDate: '2026-12-14' }, now)).toBe(100)
  })
  it('geen streefdatum → geen verplichte maandinleg', () => {
    expect(goalReservePerMonth({ target: 1000, saved: 0, targetDate: null }, now)).toBe(0)
  })
  it('al gehaald → 0', () => {
    expect(goalReservePerMonth({ target: 500, saved: 500, targetDate: '2026-12-14' }, now)).toBe(0)
  })
  it('streefdatum binnen deze maand → hele restbedrag', () => {
    expect(goalReservePerMonth({ target: 300, saved: 0, targetDate: '2026-06-20' }, now)).toBe(300)
  })
})

describe('savingsReservePerMonth', () => {
  it('telt alle doelen op', () => {
    const now = new Date(2026, 5, 14)
    const total = savingsReservePerMonth(
      [
        { target: 1200, saved: 0, targetDate: '2026-12-14' }, // 200
        { target: 600, saved: 0, targetDate: '2026-12-14' }, // 100
        { target: 999, saved: 0, targetDate: null }, // 0
      ],
      now,
    )
    expect(total).toBe(300)
  })
})

describe('allocateBudget', () => {
  const cats = [
    { id: 1, name: 'A' },
    { id: 2, name: 'B' },
    { id: 3, name: 'C' },
  ]
  it('verdeelt naar verhouding van de gemiddelden', () => {
    const m = allocateBudget(300, cats, new Map([['A', 100], ['B', 50], ['C', 50]]), 'verhouding')
    expect([m.get(1), m.get(2), m.get(3)]).toEqual([150, 75, 75])
  })
  it('verdeelt gelijk als gevraagd', () => {
    const m = allocateBudget(300, cats, new Map(), 'gelijk')
    expect([m.get(1), m.get(2), m.get(3)]).toEqual([100, 100, 100])
  })
  it('valt terug op gelijk verdelen zonder historie', () => {
    const m = allocateBudget(300, cats, new Map(), 'verhouding')
    expect([m.get(1), m.get(2), m.get(3)]).toEqual([100, 100, 100])
  })
  it('telt altijd precies op tot het potje (afronding netjes verdeeld)', () => {
    const m = allocateBudget(100, cats, new Map(), 'gelijk')
    expect([...m.values()].reduce((a, b) => a + b, 0)).toBe(100)
  })
  it('leeg potje → alles 0', () => {
    const m = allocateBudget(0, cats, new Map([['A', 100]]), 'verhouding')
    expect([m.get(1), m.get(2), m.get(3)]).toEqual([0, 0, 0])
  })
})

describe('goalReservePerMonth — vaste maandinleg', () => {
  const now = new Date(2026, 5, 14)
  it('gebruikt de ingestelde maandinleg', () => {
    expect(goalReservePerMonth({ target: 1200, saved: 0, monthly: 150 }, now)).toBe(150)
  })
  it('maandinleg gaat vóór de streefdatum', () => {
    expect(goalReservePerMonth({ target: 1200, saved: 0, monthly: 150, targetDate: '2026-12-14' }, now)).toBe(150)
  })
  it('reserveert nooit meer dan nog nodig is', () => {
    expect(goalReservePerMonth({ target: 1200, saved: 1100, monthly: 150 }, now)).toBe(100)
  })
  it('doorlopend potje zonder doelbedrag → de hele maandinleg', () => {
    expect(goalReservePerMonth({ target: 0, saved: 0, monthly: 100 }, now)).toBe(100)
  })
})

describe('loanIsActive', () => {
  const now = new Date(2026, 5, 14) // juni 2026
  it('zonder einddatum altijd actief', () => {
    expect(loanIsActive({ endDate: null }, now)).toBe(true)
    expect(loanIsActive({}, now)).toBe(true)
  })
  it('einddatum in de toekomst → actief', () => {
    expect(loanIsActive({ endDate: '2026-12-31' }, now)).toBe(true)
  })
  it('eindmaand is deze maand → nog actief', () => {
    expect(loanIsActive({ endDate: '2026-06-30' }, now)).toBe(true)
  })
  it('eindmaand voorbij → niet meer actief', () => {
    expect(loanIsActive({ endDate: '2026-05-31' }, now)).toBe(false)
  })
})
