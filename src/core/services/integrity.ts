import { getDb } from '../db/db'
import { profileStreak } from '../domain/streak'
import { localDate } from '../domain/time'

const KNOWN_EVENT_TYPES = new Set([
  'profile_created',
  'habit_checkin',
  'task_completed',
  'milestone_completed',
  'goal_completed',
])

/** Returns a list of integrity problems; empty when clean. */
export async function verifyIntegrity(): Promise<string[]> {
  const db = getDb()
  const problems: string[] = []

  const [profile, milestones, goals, habits, events] = await Promise.all([
    db.profile.get(1),
    db.milestones.toArray(),
    db.goals.toArray(),
    db.habits.toArray(),
    db.timelineEvents.toArray(),
  ])
  const tasks = await db.table('tasks').toArray()

  // no orphans: every link resolves
  const goalIds = new Set(goals.map((g) => g.id))
  const milestoneIds = new Set(milestones.map((m) => m.id))
  const habitIds = new Set(habits.map((h) => h.id))
  const taskIds = new Set<number>(tasks.map((t: { id: number }) => t.id))
  for (const m of milestones) {
    if (!goalIds.has(m.goalId)) problems.push(`milestone ${m.id} points at missing goal ${m.goalId}`)
  }
  for (const t of tasks as { id: number; goalId?: number; milestoneId?: number }[]) {
    if (t.goalId !== undefined && !goalIds.has(t.goalId)) problems.push(`task ${t.id} points at missing goal ${t.goalId}`)
    if (t.milestoneId !== undefined && !milestoneIds.has(t.milestoneId)) {
      problems.push(`task ${t.id} points at missing milestone ${t.milestoneId}`)
    }
  }
  for (const h of habits) {
    if (h.goalId !== undefined && !goalIds.has(h.goalId)) problems.push(`habit ${h.id} points at missing goal ${h.goalId}`)
  }

  // timeline references resolve; no unknown event types
  for (const e of events) {
    if (!KNOWN_EVENT_TYPES.has(e.eventType)) {
      problems.push(`timeline event ${e.id} has unknown type ${e.eventType}`)
      continue
    }
    if (e.eventType === 'habit_checkin' && e.refId !== undefined && !habitIds.has(e.refId)) {
      problems.push(`timeline event ${e.id} points at missing habit ${e.refId}`)
    }
    if (e.eventType === 'task_completed' && e.refId !== undefined && !taskIds.has(e.refId)) {
      problems.push(`timeline event ${e.id} points at missing task ${e.refId}`)
    }
    if (e.eventType === 'milestone_completed' && e.refId !== undefined && !milestoneIds.has(e.refId)) {
      problems.push(`timeline event ${e.id} points at missing milestone ${e.refId}`)
    }
    if (e.eventType === 'goal_completed' && e.refId !== undefined && !goalIds.has(e.refId)) {
      problems.push(`timeline event ${e.id} points at missing goal ${e.refId}`)
    }
  }

  // streak caches consistent with the logs
  if (profile) {
    const logs = await db.habitLogs.toArray()
    const dailyLogDates = new Set<string>()
    for (const l of logs) {
      const h = habitIds.has(l.habitId) ? await db.habits.get(l.habitId) : undefined
      if (h && h.frequency === 'daily' && !h.archived) dailyLogDates.add(l.logDate)
    }
    const { current } = profileStreak(dailyLogDates, localDate(new Date()))
    if (profile.currentStreak !== current) {
      problems.push(`profile streak ${profile.currentStreak} != recomputed ${current}`)
    }
    if (profile.bestStreak < profile.currentStreak) {
      problems.push(`profile best streak ${profile.bestStreak} < current ${profile.currentStreak}`)
    }
  }

  return problems
}
