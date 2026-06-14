import { describe, it, expect } from 'vitest'
import { parseNames, serializeNames, taskAssignees, eventWho, displayNames } from '../lib/assignees'

describe('parseNames / serializeNames', () => {
  it('parse + ontdubbelt + trimt', () => {
    expect(parseNames('["Kevin"," Marielle ","Kevin"]')).toEqual(['Kevin', 'Marielle'])
  })
  it('ongeldige invoer → leeg', () => {
    expect(parseNames(null)).toEqual([])
    expect(parseNames('niet-json')).toEqual([])
    expect(parseNames('{"a":1}')).toEqual([])
  })
  it('serialize leeg → null', () => {
    expect(serializeNames([])).toBeNull()
    expect(serializeNames([' ', ''])).toBeNull()
  })
  it('round-trip', () => {
    expect(parseNames(serializeNames(['A', 'B', 'A']))).toEqual(['A', 'B'])
  })
})

describe('taskAssignees', () => {
  it('gebruikt de assignees-lijst', () => {
    expect(taskAssignees({ assignees: '["Tom","Mara"]', assignedTo: 'Tom' })).toEqual(['Tom', 'Mara'])
  })
  it('valt terug op legacy assignedTo', () => {
    expect(taskAssignees({ assignedTo: 'Tom' })).toEqual(['Tom'])
    expect(taskAssignees({ assignedTo: null })).toEqual([])
    expect(taskAssignees({})).toEqual([])
  })
})

describe('eventWho', () => {
  it('whoList heeft voorrang', () => {
    expect(eventWho({ whoList: '["Tom","Mara"]', who: 'Tom' })).toEqual(['Tom', 'Mara'])
  })
  it('valt terug op who, behalve "Gezin"', () => {
    expect(eventWho({ who: 'Oma' })).toEqual(['Oma'])
    expect(eventWho({ who: 'Gezin' })).toEqual([])
    expect(eventWho({})).toEqual([])
  })
})

describe('displayNames', () => {
  it('join of "Gezin"', () => {
    expect(displayNames([])).toBe('Gezin')
    expect(displayNames(['Tom', 'Mara'])).toBe('Tom, Mara')
  })
})
