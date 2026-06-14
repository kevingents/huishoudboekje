import { describe, it, expect } from 'vitest'
import {
  scheduleDays,
  coParentToday,
  coParentWeek,
  presetSchedule,
  isoWeek,
  type CoParenting,
  type DayAssign,
} from '../lib/coparent'

// 2026-01-05 = maandag, ISO-week 2 (even). 2026-01-12 = maandag, ISO-week 3 (oneven).
const monEven = new Date(2026, 0, 5)
const monOdd = new Date(2026, 0, 12)
const base: CoParenting = { enabled: true, parentA: 'Mama', parentB: 'Papa', evenWeekParent: 'A' }

describe('isoWeek pariteit', () => {
  it('even vs oneven week', () => {
    expect(isoWeek(monEven) % 2).toBe(0)
    expect(isoWeek(monOdd) % 2).toBe(1)
  })
})

describe('scheduleDays', () => {
  it('zonder days = alles wissel (om-en-om week, backward compatible)', () => {
    expect(scheduleDays(base)).toEqual(['wissel', 'wissel', 'wissel', 'wissel', 'wissel', 'wissel', 'wissel'])
  })
})

describe('coParentToday', () => {
  it('om-en-om: even week → A, oneven week → B', () => {
    expect(coParentToday(base, monEven)).toEqual({ parent: 'Mama', which: 'A' })
    expect(coParentToday(base, monOdd)).toEqual({ parent: 'Papa', which: 'B' })
  })
  it('vaste dag overschrijft de wissel', () => {
    // getDay() maandag = 1 → vast bij B
    const cp: CoParenting = { ...base, days: ['wissel', 'B', 'wissel', 'wissel', 'wissel', 'wissel', 'wissel'] as DayAssign[] }
    expect(coParentToday(cp, monEven)?.parent).toBe('Papa')
    expect(coParentToday(cp, monOdd)?.parent).toBe('Papa')
  })
  it('null als niet ingeschakeld of namen ontbreken', () => {
    expect(coParentToday({ ...base, enabled: false }, monEven)).toBeNull()
    expect(coParentToday({ enabled: true, parentA: 'Mama' }, monEven)).toBeNull()
  })
})

describe('coParentWeek (weekend-preset: doordeweeks A, weekend om-en-om)', () => {
  const cp = { ...base, days: presetSchedule('weekend') }
  it('oneven week: ma–vr bij Mama, weekend bij Papa', () => {
    const wk = coParentWeek(cp, monOdd)
    expect(wk).toHaveLength(7)
    expect(wk.slice(0, 5).map((d) => d.parent)).toEqual(['Mama', 'Mama', 'Mama', 'Mama', 'Mama'])
    expect(wk.slice(5).map((d) => d.parent)).toEqual(['Papa', 'Papa']) // za, zo
    expect(wk[0].label).toBe('Ma')
    expect(wk[6].label).toBe('Zo')
  })
  it('markeert vandaag', () => {
    const wk = coParentWeek(cp, monOdd)
    expect(wk.filter((d) => d.isToday).map((d) => d.label)).toEqual(['Ma'])
  })
})

describe('presetSchedule', () => {
  it('om-en-om = alles wissel; weekend = ma-vr A, weekend wissel', () => {
    expect(presetSchedule('om-en-om')).toEqual(['wissel', 'wissel', 'wissel', 'wissel', 'wissel', 'wissel', 'wissel'])
    // index getDay: zo,ma,di,wo,do,vr,za
    expect(presetSchedule('weekend')).toEqual(['wissel', 'A', 'A', 'A', 'A', 'A', 'wissel'])
  })
})
