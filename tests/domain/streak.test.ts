import { describe, expect, it } from 'vitest'
import { dailyStreak, profileStreak, weeklyStreak } from '../../src/core/domain/streak'

describe('daily streaks', () => {
  const logs = new Set(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05'])
  it('counts ending today', () => expect(dailyStreak(logs, '2026-10-03')).toBe(3))
  it('allows anchor at yesterday', () => expect(dailyStreak(logs, '2026-10-04')).toBe(3))
  it('gap resets', () => expect(dailyStreak(logs, '2026-10-07')).toBe(0))
  it('anchors at yesterday when today has no log', () => expect(dailyStreak(logs, '2026-10-06')).toBe(1))
  it('best streak tracked over all time', () => {
    expect(profileStreak(new Set(['2026-10-01', '2026-10-02', '2026-10-10', '2026-10-11', '2026-10-12']), '2026-10-12')).toEqual({ current: 3, best: 3, lastStreakDate: '2026-10-12' })
    expect(profileStreak(new Set(['2026-10-01', '2026-10-02', '2026-10-10']), '2026-10-12').best).toBe(2)
  })
})

describe('weekly streaks across week boundaries', () => {
  const logs = new Set(['2026-09-21', '2026-09-28', '2026-10-05']) // Mondays
  it('monday weekStart', () => expect(weeklyStreak(logs, '2026-10-07', 'monday')).toBe(3))
  it('sunday weekStart still buckets by week', () => expect(weeklyStreak(logs, '2026-10-07', 'sunday')).toBe(3))
  it('current week missing but last present', () => {
    expect(weeklyStreak(new Set(['2026-09-28', '2026-10-05']), '2026-10-21', 'monday')).toBe(0)
    expect(weeklyStreak(new Set(['2026-09-28', '2026-10-05']), '2026-10-13', 'monday')).toBe(2)
  })
})
