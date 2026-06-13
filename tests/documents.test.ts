import { describe, it, expect, vi, afterEach } from 'vitest'
import { reminderThresholds, isIdDocument, expiryPhrase, expiryAction, headsUpWindow } from '@/lib/documents'

describe('reminderThresholds', () => {
  it('legitimatie seint een half jaar vooruit', () => {
    expect(reminderThresholds('legitimatie')).toEqual([180, 90, 60, 30, 14, 7, 1, 0])
  })
  it('verzekering: 3 maanden vooruit (opzegtermijn)', () => {
    expect(reminderThresholds('verzekering')).toEqual([90, 60, 30, 14, 7, 1, 0])
  })
  it('apk/contract/officieel: 2 maanden vooruit', () => {
    expect(reminderThresholds('apk')).toEqual([60, 30, 14, 7, 1, 0])
    expect(reminderThresholds('contract')).toEqual([60, 30, 14, 7, 1, 0])
    expect(reminderThresholds('officieel')).toEqual([60, 30, 14, 7, 1, 0])
  })
  it('garantie/overig: ~1 maand vooruit', () => {
    expect(reminderThresholds('garantie')).toEqual([30, 14, 7, 1, 0])
    expect(reminderThresholds('onbekend')).toEqual([30, 14, 7, 1, 0])
  })
})

describe('headsUpWindow', () => {
  it('= ruimste reminder-drempel per type', () => {
    expect(headsUpWindow('legitimatie')).toBe(180)
    expect(headsUpWindow('verzekering')).toBe(90)
    expect(headsUpWindow('apk')).toBe(60)
    expect(headsUpWindow('garantie')).toBe(30)
  })
})

describe('isIdDocument', () => {
  it('alleen legitimatie is een ID-document', () => {
    expect(isIdDocument('legitimatie')).toBe(true)
    expect(isIdDocument('garantie')).toBe(false)
  })
})

describe('expiryPhrase', () => {
  it('schaalt maanden/weken/dagen', () => {
    expect(expiryPhrase(180)).toBe('verloopt over 6 maanden')
    expect(expiryPhrase(21)).toBe('verloopt over 3 weken')
    expect(expiryPhrase(5)).toBe('verloopt over 5 dagen')
    expect(expiryPhrase(1)).toBe('verloopt morgen')
    expect(expiryPhrase(0)).toBe('verloopt vandaag')
    expect(expiryPhrase(-2)).toBe('is verlopen')
  })
})

describe('expiryAction', () => {
  it('ID-document verwijst naar de gemeente', () => {
    expect(expiryAction('legitimatie')).toMatch(/gemeente/i)
  })
  it('contract noemt de opzegtermijn', () => {
    expect(expiryAction('contract')).toMatch(/opzeg/i)
  })
  it('APK verwijst naar de garage, verzekering naar de opzegtermijn', () => {
    expect(expiryAction('apk')).toMatch(/garage/i)
    expect(expiryAction('verzekering')).toMatch(/opzeg/i)
  })
})

// daysUntil rekent t.o.v. "vandaag"; met een vaste systeemtijd toetsbaar.
describe('daysUntil (met vaste klok)', () => {
  afterEach(() => vi.useRealTimers())
  it('telt hele dagen tot een toekomstige datum', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-13T08:00:00Z'))
    const { daysUntil } = await import('@/lib/documents')
    expect(daysUntil('2026-06-20')).toBe(7)
    expect(daysUntil('2026-06-13')).toBe(0)
    expect(daysUntil('2026-06-12')).toBe(-1)
  })
})
