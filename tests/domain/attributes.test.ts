import { describe, expect, it } from 'vitest'
import { attributeFromCategory, resolveAttributes, splitXp } from '../../src/core/domain/attributes'

describe('attribute resolution', () => {
  it('category map matches case-insensitively', () => {
    expect(attributeFromCategory('Fitness')).toBe('STR')
    expect(attributeFromCategory('Learning & Study')).toBe('INT')
    expect(attributeFromCategory('deep work')).toBe('FOCUS')
    expect(attributeFromCategory('finance')).toBeNull()
  })
  it('prefers explicit attributes, then goal attribute, then category', () => {
    expect(resolveAttributes(['INT'], 'STR', 'fitness')).toEqual(['INT'])
    expect(resolveAttributes(undefined, 'STR', 'reading')).toEqual(['STR'])
    expect(resolveAttributes(undefined, undefined, 'coding')).toEqual(['FOCUS'])
    expect(resolveAttributes([], undefined, 'zzz')).toEqual([])
  })
})

describe('splitXp', () => {
  it('even split', () => expect(splitXp(120, ['STR', 'INT'])).toEqual([{ attribute: 'STR', xp: 60 }, { attribute: 'INT', xp: 60 }]))
  it('remainder to first in enum order', () => {
    expect(splitXp(119, ['SOC', 'STR'])).toEqual([{ attribute: 'STR', xp: 60 }, { attribute: 'SOC', xp: 59 }])
    expect(splitXp(100, ['STR', 'INT', 'DISC'])).toEqual([{ attribute: 'STR', xp: 34 }, { attribute: 'INT', xp: 33 }, { attribute: 'DISC', xp: 33 }])
  })
  it('none linked -> empty (caller writes null-attribute row)', () => {
    expect(splitXp(100, [])).toEqual([])
  })
})
