import { describe, it, expect } from 'vitest'
import { computeDailyBudget } from '@/lib/dailyBudget'

// Kalendermaand januari 2026 (31 dagen), startdag 1, €310 te besteden → €10/dag.
const base = {
  salaryDay: 1,
  spendablePerPeriod: 310,
  now: new Date(2026, 0, 5, 12, 0, 0), // 5 januari, dus dag 5 van de periode
}

describe('computeDailyBudget — dag/week + rollover', () => {
  it('dagbudget = bedrag / dagen; weekbudget = dag × 7', () => {
    const r = computeDailyBudget({ ...base, transactions: [] })
    expect(r.totalDays).toBe(31)
    expect(r.dailyRate).toBeCloseTo(10, 5)
    expect(r.weeklyRate).toBeCloseTo(70, 5)
  })

  it('niets uitgegeven → ongebruikt budget telt op (rollover)', () => {
    const r = computeDailyBudget({ ...base, transactions: [] })
    // dag 5, €10/dag, niets uit → 5 × 10 = €50 beschikbaar
    expect(r.availableToday).toBeCloseTo(50, 5)
    expect(r.spentInPeriod).toBe(0)
    expect(r.rolledOver).toBeCloseTo(40, 5) // €50 − het kale dagbudget €10
  })

  it('uitgaven in de periode gaan van het opgebouwde potje af', () => {
    const r = computeDailyBudget({
      ...base,
      transactions: [{ amount: 30, date: '2026-01-03', category: 'Boodschappen' }],
    })
    expect(r.spentInPeriod).toBe(30)
    expect(r.availableToday).toBeCloseTo(20, 5) // 5×10 − 30
  })

  it('meer uitgegeven dan opgebouwd → negatief (over budget)', () => {
    const r = computeDailyBudget({
      ...base,
      transactions: [{ amount: 80, date: '2026-01-02', category: 'Boodschappen' }],
    })
    expect(r.availableToday).toBeCloseTo(-30, 5) // 50 − 80
  })

  it('uitgaven buiten de periode tellen niet mee', () => {
    const r = computeDailyBudget({
      ...base,
      transactions: [{ amount: 100, date: '2025-12-20', category: 'Boodschappen' }],
    })
    expect(r.spentInPeriod).toBe(0)
    expect(r.availableToday).toBeCloseTo(50, 5)
  })
})
