import { addDaysLocal, weekKey } from './time'

/** Consecutive local dates ending today or yesterday. */
export function dailyStreak(logDates: ReadonlySet<string>, today: string): number {
  let anchor = logDates.has(today) ? today : addDaysLocal(today, -1)
  if (!logDates.has(anchor)) return 0
  let count = 0
  while (logDates.has(anchor)) {
    count++
    anchor = addDaysLocal(anchor, -1)
  }
  return count
}

/** Consecutive weeks (by weekKey) ending this week or the previous one. */
export function weeklyStreak(logDates: ReadonlySet<string>, today: string, weekStart: 'monday' | 'sunday'): number {
  const weeks = new Set<string>()
  for (const d of logDates) {
    const [y, m, day] = d.split('-').map(Number)
    weeks.add(weekKey(new Date(y, m - 1, day), weekStart))
  }
  const todayKey = weekKey(new Date(today + 'T00:00:00'), weekStart)
  const anchor0 = weeks.has(todayKey)
    ? todayKey
    : weekKey(new Date(parseTime(todayKey) - 7 * 86400000), weekStart)
  if (!weeks.has(anchor0)) return 0
  let count = 0
  // weeks are exactly 7 days apart
  let t = parseTime(anchor0)
  while (weeks.has(localKey(t, weekStart))) {
    count++
    t -= 7 * 86400000
  }
  return count
}

function parseTime(weekKeyStr: string): number {
  const [y, m, d] = weekKeyStr.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

function localKey(t: number, weekStart: 'monday' | 'sunday'): string {
  return weekKey(new Date(t), weekStart)
}

/**
 * Profile streak: consecutive dates with at least one completed daily habit.
 * Best streak is tracked over all history.
 */
export function profileStreak(logDates: ReadonlySet<string>, today: string): { current: number; best: number; lastStreakDate?: string } {
  const dates = [...logDates].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of dates) {
    run = prev !== null && addDaysLocal(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  const current = dailyStreak(logDates, today)
  const lastStreakDate =
    current > 0 ? (logDates.has(today) ? today : addDaysLocal(today, -1)) : undefined
  return { current, best, lastStreakDate }
}
