/** Local-timezone date helpers shared by every filter bar. */

import type { WeekStart } from '../preferences/schema'

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'this-week'
  | 'last-week'
  | 'next-week'
  | 'this-month'
  | 'last-month'
  | 'next-month'
  | 'all'

export interface DateRange {
  start: Date
  end: Date
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function endOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(23, 59, 59, 999)
  return copy
}

/** Week bounds honouring the user's first-day-of-week preference. */
export function startOfWeek(d: Date, weekStart: WeekStart = 'monday'): Date {
  const copy = startOfDay(d)
  const offset = weekStart === 'sunday' ? copy.getDay() : (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - offset)
  return copy
}

/** Weekday labels in display order, starting with the user's first day. */
export function weekdayLabels(weekStart: WeekStart = 'monday'): string[] {
  const mondayFirst = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return weekStart === 'sunday' ? [...mondayFirst.slice(6), ...mondayFirst.slice(0, 6)] : mondayFirst
}

export function startOfMonth(d: Date): Date {
  const copy = startOfDay(d)
  copy.setDate(1)
  return copy
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function addMonths(d: Date, months: number): Date {
  const copy = new Date(d)
  copy.setMonth(copy.getMonth() + months)
  return copy
}

export function rangeForPreset(
  preset: DatePreset,
  now = new Date(),
  weekStart: WeekStart = 'monday',
): DateRange | null {
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'yesterday': {
      const y = addDays(now, -1)
      return { start: startOfDay(y), end: endOfDay(y) }
    }
    case 'tomorrow': {
      const t = addDays(now, 1)
      return { start: startOfDay(t), end: endOfDay(t) }
    }
    case 'this-week': {
      const s = startOfWeek(now, weekStart)
      return { start: s, end: endOfDay(addDays(s, 6)) }
    }
    case 'last-week': {
      const s = addDays(startOfWeek(now, weekStart), -7)
      return { start: s, end: endOfDay(addDays(s, 6)) }
    }
    case 'next-week': {
      const s = addDays(startOfWeek(now, weekStart), 7)
      return { start: s, end: endOfDay(addDays(s, 6)) }
    }
    case 'this-month': {
      const s = startOfMonth(now)
      return { start: s, end: endOfDay(addDays(startOfMonth(addMonths(now, 1)), -1)) }
    }
    case 'last-month': {
      const s = startOfMonth(addMonths(now, -1))
      return { start: s, end: endOfDay(addDays(startOfMonth(now), -1)) }
    }
    case 'next-month': {
      const s = startOfMonth(addMonths(now, 1))
      return { start: s, end: endOfDay(addDays(startOfMonth(addMonths(now, 2)), -1)) }
    }
    case 'all':
      return null
  }
}

export function inRange(isoOrDate: string | Date, range: DateRange | null): boolean {
  if (!range) return true
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return false
  return d >= range.start && d <= range.end
}

/** Validates a user-entered start/end pair; swaps reversed bounds, rejects invalid dates. */
export function normalizeCustomRange(startInput: string, endInput: string): DateRange | null {
  if (!startInput || !endInput) return null
  const s = new Date(startInput)
  const e = new Date(endInput)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
  const start = startOfDay(s <= e ? s : e)
  const end = endOfDay(s <= e ? e : s)
  return { start, end }
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
