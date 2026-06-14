import { describe, it, expect } from 'vitest'
import {
  scheduleDays,
  coParentToday,
  coParentWeek,
  presetSchedule,
  type CoParenting,
  type DayAssign,
} from '../lib/coparent'

const mon1 = new Date(2026, 0, 5) // een maandag
const mon2 = new Date(2026, 0, 12) // de maandag erop
const base: CoParenting = { enabled: true, parentA: 'Mama', parentB: 'Papa', evenWeekParent: 'A' }

describe('scheduleDays', () => {
  it('zonder days = alles wissel (om-en-om week, backward compatible)', () => {
    expect(scheduleDays(base)).toEqual(Array(7).fill('wissel'))
  })
})

describe('coParentToday — om-en-om', () => {
  it('opeenvolgende weken wisselen van ouder', () => {
    const a = coParentToday(base, mon1)
    const b = coParentToday(base, mon2)
    expect(a?.which).not.toBe(b?.which)
    expect([a?.which, b?.which].sort()).toEqual(['A', 'B'])
  })

  it('blijft om-en-om over de jaargrens (geen dubbele week in 53-weken-jaren)', () => {
    // 2026 heeft ISO-week 53: 28 dec 2026 (ma) → 4 jan 2027 (ma) zijn ISO-gezien beide
    // oneven, maar het zorgschema moet netjes blijven wisselen.
    const w53 = coParentToday(base, new Date(2026, 11, 28))
    const w1 = coParentToday(base, new Date(2027, 0, 4))
    expect(w53?.which).not.toBe(w1?.which)
  })

  it('vaste dag overschrijft de wissel', () => {
    // getDay() maandag = 1 → vast bij B
    const cp: CoParenting = { ...base, days: ['wissel', 'B', 'wissel', 'wissel', 'wissel', 'wissel', 'wissel'] as DayAssign[] }
    expect(coParentToday(cp, mon1)?.parent).toBe('Papa')
    expect(coParentToday(cp, mon2)?.parent).toBe('Papa')
  })

  it('null als niet ingeschakeld of namen ontbreken', () => {
    expect(coParentToday({ ...base, enabled: false }, mon1)).toBeNull()
    expect(coParentToday({ enabled: true, parentA: 'Mama' }, mon1)).toBeNull()
  })
})

describe('coParentWeek — weekend-preset (doordeweeks A, weekend om-en-om)', () => {
  const cp: CoParenting = { ...base, days: presetSchedule('weekend') }

  it('in de week dat het weekend bij Papa valt: ma–vr Mama, weekend Papa', () => {
    const w1 = coParentWeek(cp, mon1)
    const w2 = coParentWeek(cp, mon2)
    const week = w1[5].parent === 'Papa' ? w1 : w2 // kies de week met weekend bij Papa
    expect(week).toHaveLength(7)
    expect(week.slice(0, 5).map((d) => d.parent)).toEqual(['Mama', 'Mama', 'Mama', 'Mama', 'Mama'])
    expect(week.slice(5).map((d) => d.parent)).toEqual(['Papa', 'Papa']) // za, zo
    expect(week[0].label).toBe('Ma')
    expect(week[6].label).toBe('Zo')
  })

  it('markeert vandaag', () => {
    const wk = coParentWeek(cp, mon1)
    expect(wk.filter((d) => d.isToday).map((d) => d.label)).toEqual(['Ma'])
  })
})

describe('presetSchedule', () => {
  it('om-en-om = alles wissel; weekend = ma-vr A, weekend wissel', () => {
    expect(presetSchedule('om-en-om')).toEqual(Array(7).fill('wissel'))
    // index getDay: zo,ma,di,wo,do,vr,za
    expect(presetSchedule('weekend')).toEqual(['wissel', 'A', 'A', 'A', 'A', 'A', 'wissel'])
  })
})
