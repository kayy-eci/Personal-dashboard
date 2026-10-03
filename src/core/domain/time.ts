export interface Clock {
  now(): Date
}

export const systemClock: Clock = { now: () => new Date() }

/** Local calendar date as YYYY-MM-DD (never use toISOString for local dates). */
export function localDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysLocal(s: string, days: number): string {
  const d = parseLocalDate(s)
  d.setDate(d.getDate() + days)
  return localDate(d)
}

/** Next local midnight plus one minute (restart-safe across DST). */
export function nextMidnightPlusOne(from: Date): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 0, 1, 0, 0)
}

/** Week key for streak bucketing, respecting week start. */
export function weekKey(d: Date, weekStart: 'monday' | 'sunday'): string {
  const day = d.getDay()
  const diff = weekStart === 'monday' ? (day + 6) % 7 : day
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
  return localDate(start)
}
