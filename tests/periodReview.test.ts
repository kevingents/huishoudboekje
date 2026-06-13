import { describe, it, expect } from 'vitest'
import { reviewPeriod } from '@/lib/periodReview'
import { spendablePerMonth } from '@/lib/budget'

describe('spendablePerMonth', () => {
  it('= inkomen − vaste lasten − abonnementen − aflossingen, nooit negatief', () => {
    const s = spendablePerMonth({
      incomes: [{ amount: 2000, interval: '1 month' }],
      costs: [{ amount: 800 }],
      subscriptions: [{ amount: 12, interval: '1 month', status: 'active' }],
      loans: [{ termAmount: 188 }],
    })
    expect(s).toBe(1000) // 2000 − 800 − 12 − 188
  })
  it('jaarabonnement telt per maand; opgezegde subs tellen niet', () => {
    const s = spendablePerMonth({
      incomes: [{ amount: 1000, interval: '1 month' }],
      costs: [],
      subscriptions: [
        { amount: 120, interval: '12 months', status: 'active' }, // €10 p/m
        { amount: 100, interval: '1 month', status: 'cancelled' }, // telt niet
      ],
      loans: [],
    })
    expect(s).toBe(990)
  })
  it('clamp op 0 bij meer lasten dan inkomen', () => {
    expect(spendablePerMonth({ incomes: [], costs: [{ amount: 50 }], subscriptions: [], loans: [] })).toBe(0)
  })
})

describe('reviewPeriod', () => {
  const cats = [
    { name: 'Boodschappen', limit: 400 },
    { name: 'Horeca', limit: 100 },
    { name: 'Inkomsten', limit: 0 }, // gereserveerd → niet meegeteld
  ]
  const txns = [
    { category: 'Boodschappen', amount: 300, date: '2026-05-20' }, // vorige periode (mei)
    { category: 'Horeca', amount: 60, date: '2026-05-22' },
    { category: 'Boodschappen', amount: 1000, date: '2026-06-20' }, // huidige periode → telt niet
    { category: 'Inkomsten', amount: 2000, date: '2026-05-25' }, // inkomsten → telt niet als uitgave
  ]

  it('telt alleen variabele uitgaven in de gekozen periode', () => {
    const r = reviewPeriod({ transactions: txns, spendingCategories: cats, spendable: 500, periodKey: '2026-05', periodStart: 1 })
    expect(r.spent).toBe(360) // 300 + 60
    expect(r.surplus).toBe(140) // 500 − 360
    expect(r.overspend).toBe(0)
    expect(r.withinBudget).toBe(true)
  })

  it('rekent overschrijding uit en zet surplus op 0', () => {
    const r = reviewPeriod({ transactions: txns, spendingCategories: cats, spendable: 300, periodKey: '2026-05', periodStart: 1 })
    expect(r.spent).toBe(360)
    expect(r.surplus).toBe(0)
    expect(r.overspend).toBe(60)
    expect(r.withinBudget).toBe(false)
  })

  it('geeft per categorie spent + limit, gesorteerd op meeste uitgaven', () => {
    const r = reviewPeriod({ transactions: txns, spendingCategories: cats, spendable: 500, periodKey: '2026-05', periodStart: 1 })
    expect(r.categories[0]).toMatchObject({ name: 'Boodschappen', spent: 300, limit: 400 })
    expect(r.categories.find((c) => c.name === 'Horeca')).toMatchObject({ spent: 60 })
  })

  it('respecteert een periode-startdag (15e–15e)', () => {
    // Met startdag 15 hoort 14 mei nog bij de periode die in april begon.
    const t = [{ category: 'Boodschappen', amount: 50, date: '2026-05-14' }]
    expect(reviewPeriod({ transactions: t, spendingCategories: cats, spendable: 100, periodKey: '2026-05', periodStart: 15 }).spent).toBe(0)
    expect(reviewPeriod({ transactions: t, spendingCategories: cats, spendable: 100, periodKey: '2026-04', periodStart: 15 }).spent).toBe(50)
  })
})
