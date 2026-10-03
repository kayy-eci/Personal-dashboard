import { describe, expect, it } from 'vitest'
import { clampHealth, computeDailyVitalityLoss, recoveryGain } from '../../src/core/domain/health'
import { addDaysLocal, localDate, nextMidnightPlusOne } from '../../src/core/domain/time'

const s = { max: 100, lossPerMissedHabit: 5, lossPerMissedQuest: 5, recoveryAmount: 8, recoveryDailyLimit: 2 }

describe('vitality math', () => {
  it('computes loss from missed habits and quests', () => {
    expect(computeDailyVitalityLoss(4, 2, 1, s).totalLoss).toBe(2 * 5 + 5)
    expect(computeDailyVitalityLoss(4, 4, 0, s).totalLoss).toBe(0)
  })
  it('clamps at 0 and recovery at max', () => {
    expect(clampHealth(-3, 100)).toBe(0)
    expect(clampHealth(120, 100)).toBe(100)
    expect(recoveryGain(97, 100, 8)).toBe(3)
  })
})

describe('time helpers', () => {
  it('localDate uses local fields', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
  it('addDaysLocal crosses month boundaries', () => {
    expect(addDaysLocal('2026-01-31', 1)).toBe('2026-02-01')
  })
  it('nextMidnightPlusOne is after the current time and one minute past midnight', () => {
    const now = new Date(2026, 5, 15, 10, 30)
    const n = nextMidnightPlusOne(now)
    expect(n.getHours()).toBe(0)
    expect(n.getMinutes()).toBe(1)
    expect(n.getTime()).toBeGreaterThan(now.getTime())
    expect(n.getDate()).toBe(now.getDate() + 1)
  })
  it('recomputing next midnight does not equal adding 24h on DST change', () => {
    const a = nextMidnightPlusOne(new Date(2026, 2, 28, 12))
    const b = new Date(2026, 2, 28, 12)
    b.setDate(b.getDate() + 1)
    b.setHours(0, 1, 0, 0)
    expect(a.getTime()).toBe(b.getTime())
  })
})
