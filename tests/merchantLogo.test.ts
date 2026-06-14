import { describe, it, expect } from 'vitest'
import { merchantIcon, merchantInitials, merchantColorIndex } from '../lib/merchantLogo'

describe('merchantIcon', () => {
  it('herkent supermarkten uit een ruwe pinomschrijving', () => {
    expect(merchantIcon('BEA, APPLE PAY ALBERT HEIJN 1353 HAARLEM')).toBe('cart')
    expect(merchantIcon('JUMBO HAARLEM SCHALKWIJK')).toBe('cart')
  })
  it('herkent tankstations en vervoer', () => {
    expect(merchantIcon('SHELL HAARLEM NOORD')).toBe('fuel')
    expect(merchantIcon('NS GROEP IZ NS REIZIGERS')).toBe('transit')
  })
  it('herkent abonnementen en webshops', () => {
    expect(merchantIcon('NETFLIX.COM')).toBe('subscription')
    expect(merchantIcon('/TRTP/IDEAL/NAME/BOL.COM/REMI/x')).toBe('shopping')
  })
  it('geeft null voor onbekende winkels', () => {
    expect(merchantIcon('Kapsalon Marco')).toBeNull()
  })
})

describe('merchantInitials', () => {
  it('pakt twee woorden als initialen', () => {
    expect(merchantInitials('ALBERT HEIJN VOS')).toBe('AH')
  })
  it('pakt twee letters bij één woord', () => {
    expect(merchantInitials('BOL.COM')).toBe('BO')
  })
  it('valt netjes terug bij lege invoer (label "Onbekend")', () => {
    expect(merchantInitials('')).toBe('ON')
  })
})

describe('merchantColorIndex', () => {
  it('is stabiel: dezelfde winkel geeft dezelfde index', () => {
    const a = merchantColorIndex('ALBERT HEIJN VOS', 8)
    const b = merchantColorIndex('BEA, APPLE PAY ALBERT HEIJN 1353 HAARLEM', 8)
    expect(a).toBe(b) // beide → merchantKey "albert heijn"
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(8)
  })
})
