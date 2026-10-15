/**
 * New post-removal behavior (§11): dashboard summary, neutral analytics,
 * uncheck removing its timeline event, and RPG-free exports.
 *
 * RED in Phase 1: `getDashboardSummary` and the neutral activity series do
 * not exist; uncheck does not remove the event; exports still carry RPG data.
 */
import { describe, expect, it, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { LifeOSDb, setDbForTests } from '../../src/core/db/db'
import { createProfile } from '../../src/core/repo/profile'
import { checkInHabit } from '../../src/core/services/completion'
import { exportData } from '../../src/core/services/backup'
import { getAnalytics } from '../../src/data/views'
import * as views from '../../src/data/views'
import { uncheckHabitToday } from '../../src/data/write'
import { addDaysLocal, localDate } from '../../src/core/domain/time'

/** Dynamic lookup so the file loads before the summary exists (RED). */
function requireSummary(): () => Promise<{
  profileName: string
  habitsToday: { done: number; total: number }
  tasksDueToday: number
  overdue: number
  streak: { current: number; best: number }
}> {
  const fn = (views as unknown as Record<string, unknown>).getDashboardSummary
  if (typeof fn !== 'function') throw new Error('RED: getDashboardSummary not implemented')
  return fn as () => Promise<{
    profileName: string
    habitsToday: { done: number; total: number }
    tasksDueToday: number
    overdue: number
    streak: { current: number; best: number }
  }>
}

async function addNeutralHabit(db: LifeOSDb, name: string): Promise<number> {
  return (await db.table('habits').add({ name, frequency: 'daily', category: 'general', archived: false, createdAt: new Date().toISOString(), createdLocalDate: today() })) as number
}

let db: LifeOSDb
const today = () => localDate(new Date())

beforeEach(async () => {
  db = new LifeOSDb(`new-${Math.random().toString(36).slice(2)}`)
  setDbForTests(db)
  const { seedDatabase } = await import('../../src/core/db/db')
  await seedDatabase(db)
  await createProfile('Tester')
})

async function cleanup() {
  setDbForTests(null as never)
  await db.close()
  await Dexie.delete(db.name)
}

describe('dashboard summary (new)', () => {
  it('reports name, streak, habits today, due today, and overdue', async () => {
    const doneId = await addNeutralHabit(db, 'Done')
    await addNeutralHabit(db, 'Open')
    await checkInHabit(doneId)
    const t = today()
    await db.table('tasks').add({ title: 'Due today', description: '', category: 'general', deadline: t, status: 'active', createdAt: new Date().toISOString(), createdLocalDate: t })
    await db.table('tasks').add({ title: 'Overdue', description: '', category: 'general', deadline: addDaysLocal(t, -2), status: 'active', createdAt: new Date().toISOString(), createdLocalDate: addDaysLocal(t, -3) })

    const summary = await requireSummary()()
    expect(summary.profileName).toBe('Tester')
    expect(summary.habitsToday).toEqual({ done: 1, total: 2 })
    expect(summary.tasksDueToday).toBe(1)
    expect(summary.overdue).toBe(1)
    expect(summary.streak.current).toBeGreaterThanOrEqual(1)
    const keys = Object.keys(summary)
    for (const banned of ['level', 'totalXp', 'xpIntoLevel', 'health', 'maxHealth', 'attributes', 'xpTotals']) {
      expect(keys, `summary must not expose ${banned}`).not.toContain(banned)
    }
    await cleanup()
  })
})

describe('analytics activity series (new)', () => {
  it('counts completed items per day on a hand-checked dataset', async () => {
    const h = await addNeutralHabit(db, 'Run')
    const t = today()
    // 2 check-ins on distinct days + 1 completed task = 1,1,0 pattern
    await db.habitLogs.add({ habitId: h, logDate: addDaysLocal(t, -2), createdAt: new Date().toISOString() })
    await db.habitLogs.add({ habitId: h, logDate: addDaysLocal(t, -1), createdAt: new Date().toISOString() })
    await db.table('tasks').add({ title: 'Done task', description: '', category: 'general', status: 'completed', completedLocalDate: addDaysLocal(t, -1), createdAt: new Date().toISOString(), createdLocalDate: addDaysLocal(t, -2) })

    const a = await getAnalytics(7)
    expect(a.labels.length).toBe(7)
    const byLabel = new Map(a.labels.map((l, i) => [l, a.activity[i]]))
    expect(byLabel.get(addDaysLocal(t, -2).slice(5))).toBe(1)
    expect(byLabel.get(addDaysLocal(t, -1).slice(5))).toBe(2)
    expect(byLabel.get(t.slice(5))).toBe(0)
    expect(a).not.toHaveProperty('xpTotal')
    await cleanup()
  })
})

describe('uncheck removes its timeline event (new)', () => {
  it('unchecking today removes the log and its habit_checkin event', async () => {
    const id = await addNeutralHabit(db, 'Run')
    await checkInHabit(id)
    expect(await db.timelineEvents.where('eventType').equals('habit_checkin').count()).toBe(1)
    await uncheckHabitToday(id)
    expect(await db.habitLogs.where('habitId').equals(id).count()).toBe(0)
    expect(await db.timelineEvents.where('eventType').equals('habit_checkin').count()).toBe(0)
    await cleanup()
  })
})

describe('exports carry no RPG data (new)', () => {
  it('export contains no XP, level, vitality, attribute, or ledger fields', async () => {
    const json = await exportData()
    const parsed = JSON.parse(json) as { schemaVersion: number; tables: Record<string, unknown[]> }
    expect(parsed.schemaVersion).toBe(2)
    for (const gone of ['xpLedger', 'healthLogs', 'attributeStats', 'achievements', 'quests']) {
      expect(parsed.tables, `export must not include ${gone}`).not.toHaveProperty(gone)
    }
    expect(parsed.tables).toHaveProperty('tasks')
    const text = JSON.stringify(parsed.tables)
    for (const banned of ['xpDelta', 'healthDelta', 'baseXp', 'formulaVersion', 'lossKey']) {
      expect(text, `export must not mention ${banned}`).not.toContain(banned)
    }
    await cleanup()
  })
})
