/**
 * v2 → v3 data migration: copy and transform.
 *
 * Old tables stay present in v3; v4 drops the RPG stores. All work happens
 * inside the Dexie upgrade transaction: if verification throws, the whole
 * upgrade rolls back and the database stays at the old version untouched.
 */
import Dexie, { type Transaction } from 'dexie'
import { profileStreak } from '../domain/streak'
import { localDate } from '../domain/time'

/** Row shapes of the legacy v2 schema (kept here so types.ts stays clean). */
export interface LegacyQuest {
  id: number
  goalId?: number
  milestoneId?: number
  title: string
  description: string
  category: string
  scheduledDate?: string
  deadline?: string
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  createdLocalDate: string
  completedAt?: string
  completedLocalDate?: string
}

export interface LegacyTimelineEvent {
  id?: number
  eventType: string
  refType?: string
  refId?: number
  title: string
  note: string
  localDate: string
  createdAt: string
}

export const REMOVED_EVENT_TYPES = new Set([
  'level_up',
  'attribute_level_up',
  'achievement_unlocked',
  'vitality_loss',
  'vitality_gain',
])

export const V3_TASKS_INDEXES = '++id, goalId, milestoneId, status, deadline, scheduledDate, completedLocalDate'
export const V3_HABITS_INDEXES = '++id, goalId, frequency, archived'

/** quests → tasks, keeping the same id so references stay valid. */
export function questToTask(q: Record<string, unknown> & { id: number }): Record<string, unknown> {
  return {
    id: q.id,
    goalId: q.goalId,
    milestoneId: q.milestoneId,
    title: q.title,
    description: q.description,
    category: q.category,
    scheduledDate: q.scheduledDate,
    deadline: q.deadline,
    status: q.status,
    createdAt: q.createdAt,
    createdLocalDate: q.createdLocalDate,
    completedAt: q.completedAt,
    completedLocalDate: q.completedLocalDate,
  }
}

export function isRemovedSettingKey(key: string): boolean {
  return key.startsWith('health.') || key.startsWith('xp.')
}

type TableSource = Pick<Dexie, 'table'>

/**
 * Recompute the profile streak caches from the habit logs. Current streak is
 * derived data — it is refreshed on migration and on import so the caches
 * stay consistent with the logs. Best streak is a historical max and is kept
 * (raised only if the recomputed current exceeds it).
 */
export async function refreshProfileStreakCache(dbLike: TableSource): Promise<void> {
  const profile = (await dbLike.table('profile').get(1)) as
    | { currentStreak: number; bestStreak: number; lastStreakDate?: string }
    | undefined
  if (!profile) return
  const logs = (await dbLike.table('habitLogs').toArray()) as { habitId: number; logDate: string }[]
  const habits = (await dbLike.table('habits').toArray()) as { id: number; frequency: string; archived: boolean }[]
  const activeDaily = new Set(habits.filter((h) => h.frequency === 'daily' && !h.archived).map((h) => h.id))
  const dailyLogDates = new Set(logs.filter((l) => activeDaily.has(l.habitId)).map((l) => l.logDate))
  const { current, best, lastStreakDate } = profileStreak(dailyLogDates, localDate(new Date()))
  await dbLike.table('profile').update(1, {
    currentStreak: current,
    bestStreak: Math.max(profile.bestStreak, best, current),
    lastStreakDate,
  })
}

/** Delete RPG event rows, rename quest refs, strip delta chips. Returns kept count. */
export async function migrateTimeline(tx: Transaction): Promise<{ before: number; removed: number; after: number }> {
  const table = tx.table('timelineEvents')
  const before: number = await table.count()
  const removedRows: { eventType: string }[] = await table.where('eventType').anyOf([...REMOVED_EVENT_TYPES]).toArray()
  const removed = removedRows.length
  if (removed > 0) await table.where('eventType').anyOf([...REMOVED_EVENT_TYPES]).delete()
  await table.toCollection().modify((e: Record<string, unknown>) => {
    if (e.eventType === 'quest_completed') e.eventType = 'task_completed'
    if (e.refType === 'quest') e.refType = 'task'
    delete e.xpDelta
    delete e.healthDelta
  })
  const after: number = await table.count()
  return { before, removed, after }
}

/** Full v2 → v3 transform wired as the Dexie v3 upgrade function. */
export async function upgradeV2toV3(tx: Transaction): Promise<void> {
  const quests: (LegacyQuest & Record<string, unknown>)[] = await tx.table('quests').toArray()
  const questsBefore = quests.length
  const habitsBefore: number = await tx.table('habits').count()
  const goalsBefore: number = await tx.table('goals').count()
  const milestonesBefore: number = await tx.table('milestones').count()
  const habitLogsBefore: number = await tx.table('habitLogs').count()
  const githubBefore: number = await tx.table('githubActivity').count()
  const chatsBefore: number = await tx.table('chats').count()
  const settingsRows: { key: string }[] = await tx.table('settings').toArray()
  const settingsBefore = settingsRows.length
  const doomedSettings = settingsRows.filter((s) => isRemovedSettingKey(s.key)).map((s) => s.key)

  // 1. quests → tasks with identical ids
  const tasks = quests.map(questToTask)
  if (tasks.length > 0) await tx.table('tasks').bulkAdd(tasks)

  // 2. habits: strip ratings and attribute links
  await tx.table('habits').toCollection().modify((h: Record<string, unknown>) => {
    delete h.difficulty
    delete h.impact
    delete h.attributes
  })

  // 3. goals: strip attribute link
  await tx.table('goals').toCollection().modify((g: Record<string, unknown>) => {
    delete g.attribute
  })

  // 4. profile: strip game fields
  const profile = (await tx.table('profile').get(1)) as Record<string, unknown> | undefined
  if (profile) {
    delete profile.level
    delete profile.totalXp
    delete profile.health
    delete profile.maxHealth
    await tx.table('profile').put(profile)
  }

  // 5. timeline: drop game events, rename, strip deltas
  const timeline = await migrateTimeline(tx)

  // 6. settings: drop game keys
  if (doomedSettings.length > 0) await tx.table('settings').bulkDelete(doomedSettings)

  // 7. streak caches: recompute current from the logs, keep the best
  await refreshProfileStreakCache(tx)

  // 8. verify inside the upgrade — throw rolls everything back
  const failures: string[] = []
  const tasksAfter: number = await tx.table('tasks').count()
  if (tasksAfter !== questsBefore) failures.push(`tasks ${tasksAfter} != quests ${questsBefore}`)
  const counts: [string, number, number][] = [
    ['habits', await tx.table('habits').count(), habitsBefore],
    ['goals', await tx.table('goals').count(), goalsBefore],
    ['milestones', await tx.table('milestones').count(), milestonesBefore],
    ['habitLogs', await tx.table('habitLogs').count(), habitLogsBefore],
    ['githubActivity', await tx.table('githubActivity').count(), githubBefore],
    ['chats', await tx.table('chats').count(), chatsBefore],
    ['timelineEvents', timeline.after, timeline.before - timeline.removed],
    ['settings', await tx.table('settings').count(), settingsBefore - doomedSettings.length],
  ]
  for (const [name, actual, expected] of counts) {
    if (actual !== expected) failures.push(`${name} ${actual} != expected ${expected}`)
  }

  const allHabits: Record<string, unknown>[] = await tx.table('habits').toArray()
  if (allHabits.some((h) => 'difficulty' in h || 'impact' in h || 'attributes' in h)) {
    failures.push('habits still carry RPG fields')
  }
  const allGoals: Record<string, unknown>[] = await tx.table('goals').toArray()
  if (allGoals.some((g) => 'attribute' in g)) failures.push('goals still carry attribute')
  const allTasks: Record<string, unknown>[] = await tx.table('tasks').toArray()
  if (allTasks.some((t) => 'type' in t || 'difficulty' in t || 'effort' in t || 'impact' in t || 'baseXp' in t || 'attributes' in t)) {
    failures.push('tasks still carry RPG fields')
  }
  const keptEvents: LegacyTimelineEvent[] = await tx.table('timelineEvents').toArray()
  if (keptEvents.some((e) => REMOVED_EVENT_TYPES.has(e.eventType))) failures.push('removed event types remain')
  if (keptEvents.some((e) => e.eventType === 'quest_completed' || e.refType === 'quest')) {
    failures.push('quest event refs remain')
  }
  if (keptEvents.some((e) => 'xpDelta' in e || 'healthDelta' in e)) failures.push('event deltas remain')
  const keptSettings: { key: string }[] = await tx.table('settings').toArray()
  if (keptSettings.some((s) => isRemovedSettingKey(s.key))) failures.push('removed settings keys remain')
  const keptProfile = (await tx.table('profile').get(1)) as Record<string, unknown> | undefined
  if (keptProfile && ('level' in keptProfile || 'totalXp' in keptProfile || 'health' in keptProfile || 'maxHealth' in keptProfile)) {
    failures.push('profile still carries game fields')
  }

  if (failures.length > 0) throw new Error(`migration verification failed: ${failures.join('; ')}`)
}
