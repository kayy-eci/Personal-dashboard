import { describe, expect, it } from 'vitest'
import { attributeXpForNext, detectLevelUps, levelFromTotalXp, progressInLevel, playerXpForNext } from '../../src/core/domain/levels'

describe('levels', () => {
  it('level 1 needs 130 and rises one level per threshold', () => {
    expect(playerXpForNext(1)).toBe(130)
    expect(levelFromTotalXp(0)).toBe(1)
    expect(levelFromTotalXp(129)).toBe(1)
    expect(levelFromTotalXp(130)).toBe(2)
  })
  it('thresholds around 26 and 99', () => {
    let total = 0
    for (let l = 1; l < 25; l++) total += playerXpForNext(l)
    expect(levelFromTotalXp(total)).toBe(25)
    total += playerXpForNext(25)
    expect(levelFromTotalXp(total)).toBe(26)
  })
  it('caps at 100', () => {
    let total = 0
    for (let l = 1; l < 100; l++) total += playerXpForNext(l)
    expect(levelFromTotalXp(total)).toBe(100)
    expect(levelFromTotalXp(total + 99999)).toBe(100)
  })
  it('attribute levels use their own curve', () => {
    expect(attributeXpForNext(1)).toBe(75)
    expect(levelFromTotalXp(75, false)).toBe(2)
  })
  it('multi-level jumps detected', () => {
    expect(detectLevelUps(0, 130 + 140)).toEqual({ from: 1, to: 3 })
    expect(detectLevelUps(130, 129)).toBeNull()
  })
  it('progress within level', () => {
    const p = progressInLevel(130 + 65)
    expect(p.level).toBe(2)
    expect(p.xpIntoLevel).toBe(65)
    expect(p.xpForNext).toBe(140)
  })
})
