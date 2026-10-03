import { describe, expect, it } from 'vitest'
import { computeXp, consistencyMultiplier, questBaseXp, ratingMultiplier } from '../../src/core/domain/xp'

describe('xp multipliers', () => {
  it('maps every difficulty rating', () => {
    expect([1, 2, 3, 4, 5].map((r) => ratingMultiplier('difficulty', r))).toEqual([0.8, 1.0, 1.25, 1.5, 2.0])
  })
  it('maps every effort rating', () => {
    expect([1, 2, 3, 4, 5].map((r) => ratingMultiplier('effort', r))).toEqual([0.8, 0.9, 1.0, 1.2, 1.4])
  })
  it('maps every impact rating', () => {
    expect([1, 2, 3, 4, 5].map((r) => ratingMultiplier('impact', r))).toEqual([0.9, 1.0, 1.05, 1.1, 1.25])
  })
})

describe('computeXp', () => {
  it('matches the 119 XP example', () => {
    const b = computeXp({ base: 60, difficulty: 4, effort: 4, impact: 4, consistencyMultiplier: 1.0, consistencyStreakDays: 0 })
    expect(b.raw).toBeCloseTo(118.8, 5)
    expect(b.final).toBe(119)
  })
  it('rounds half up', () => {
    expect(computeXp({ base: 30, difficulty: 3, effort: 2, impact: 1 }).final).toBe(Math.floor(30 * 1.25 * 0.9 * 0.9 + 0.5))
    expect(computeXp({ base: 10, difficulty: 1, effort: 1, impact: 1 }).final).toBe(6) // 5.76 -> 6
  })
  it('never returns below 1', () => {
    expect(computeXp({ base: 15, difficulty: 1, effort: 1, impact: 1 }).final).toBeGreaterThanOrEqual(1)
  })
  it('habits get effort multiplier 1.0 (no effort rating)', () => {
    const b = computeXp({ base: 15, difficulty: 3, impact: 3 })
    expect(b.effort.multiplier).toBe(1)
  })
  it('consistency tiers', () => {
    expect(consistencyMultiplier(0)).toBe(1.0)
    expect(consistencyMultiplier(2)).toBe(1.0)
    expect(consistencyMultiplier(3)).toBe(1.05)
    expect(consistencyMultiplier(7)).toBe(1.1)
    expect(consistencyMultiplier(14)).toBe(1.15)
    expect(consistencyMultiplier(30)).toBe(1.2)
  })
  it('quest base XP by type', () => {
    expect(questBaseXp('main')).toBe(60)
    expect(questBaseXp('side')).toBe(30)
    expect(questBaseXp('challenge')).toBe(40)
    expect(questBaseXp('recovery')).toBe(10)
    expect(questBaseXp('main', 120)).toBe(120)
  })
})
