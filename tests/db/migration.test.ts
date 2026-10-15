/**
 * Migration test (§11): a legacy v2 database (old schema, RPG data) opened
 * with the new schema must migrate without losing user data.
 *
 * RED in Phase 1: versions 3/4, the `tasks` table, and the migration helpers
 * do not exist yet.
 */
import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { LifeOSDb, setDbForTests } from '../../src/core/db/db'
import { verifyIntegrity } from '../../src/core/services/integrity'
import { importData } from '../../src/core/services/backup'

/** Dynamic lookup so the file loads before the migration module exists (RED). */
async function requireDumpBuilder(): Promise<(dbName: string) => Promise<string>> {
  const specifier = '../../src/core/services/preUpgradeBackup'
  const mod = (await import(/* @vite-ignore */ specifier).catch(() => null)) as {
    buildPreUpgradeDump?: (dbName: string) => Promise<string>
  } | null
  if (!mod?.buildPreUpgradeDump) throw new Error('RED: buildPreUpgradeDump not implemented')
  return mod.buildPreUpgradeDump
}

const NAME = 'mig-legacy-v2'
const NOW = '2026-10-01T08:00:00.000Z'

/** A log dated today proves a live streak survives the migration. */
function todayStr(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function breakdown(final: number) {
  return {
    base: 60,
    difficulty: { rating: 2, multiplier: 1 },
    effort: { rating: 2, multiplier: 1 },
    impact: { rating: 2, multiplier: 1 },
    consistency: { streakDays: 0, multiplier: 1 },
    cap: null,
    formulaVersion: 1,
    final,
  }
}

/** Legacy v2 schema, declared exactly as the old LifeOSDb versions 1+2 did. */
function openLegacy(): Dexie {
  const dexie = new Dexie(NAME)
  dexie.version(2).stores({
    profile: 'id',
    attributeStats: 'attribute',
    goals: '++id, status, deadline',
    milestones: '++id, goalId, [goalId+orderIndex], status',
    quests: '++id, goalId, milestoneId, type, status, deadline, scheduledDate, completedLocalDate, *attributes',
    habits: '++id, goalId, frequency, archived, *attributes',
    habitLogs: '++id, habitId, logDate, &[habitId+logDate]',
    xpLedger: '++id, localDate, attribute, [attribute+localDate], [sourceType+sourceId]',
    healthLogs: '++id, logDate, kind, &lossKey',
    timelineEvents: '++id, localDate, eventType, [localDate+id], [eventType+localDate]',
    achievements: 'ruleKey',
    githubActivity: '++id, activityDate, &[activityDate+repoName]',
    settings: 'key',
    handles: 'key',
    chats: '++id, createdAt',
  })
  return dexie
}

async function seedLegacy(): Promise<void> {
  const dexie = openLegacy()
  await dexie.open()
  const t = (name: string) => dexie.table(name)
  await t('profile').put({ id: 1, name: 'Legacy User', level: 5, totalXp: 480, health: 80, maxHealth: 100, currentStreak: 4, bestStreak: 9, lastStreakDate: '2026-09-30', createdAt: NOW, updatedAt: NOW })
  await t('attributeStats').bulkPut([
    { attribute: 'STR', xp: 120, level: 3 },
    { attribute: 'INT', xp: 200, level: 3 },
    { attribute: 'DISC', xp: 60, level: 2 },
    { attribute: 'CREAT', xp: 40, level: 1 },
    { attribute: 'FOCUS', xp: 60, level: 2 },
    { attribute: 'SOC', xp: 0, level: 1 },
  ])
  await t('goals').bulkPut([
    { id: 1, title: 'Read more', description: 'Finish books', category: 'learning', attribute: 'INT', status: 'active', deadline: '2026-12-31', createdAt: NOW },
    { id: 2, title: 'Get fit', description: '', category: 'health & fitness', status: 'active', createdAt: NOW },
  ])
  await t('milestones').bulkPut([
    { id: 1, goalId: 1, title: 'Finish book one', orderIndex: 0, status: 'done', completedAt: NOW },
    { id: 2, goalId: 1, title: 'Finish book two', orderIndex: 1, status: 'pending' },
    { id: 3, goalId: 2, title: 'Run 5k', orderIndex: 0, status: 'pending' },
  ])
  await t('quests').bulkPut([
    { id: 1, goalId: 1, milestoneId: 2, title: 'Read chapter five', description: 'Pages 100-120', type: 'side', category: 'reading', difficulty: 2, effort: 2, impact: 2, attributes: ['INT'], scheduledDate: '2026-10-01', deadline: '2026-10-05', status: 'active', createdAt: NOW, createdLocalDate: '2026-10-01' },
    { id: 2, title: 'Evening walk', description: '', type: 'recovery', category: 'health & fitness', difficulty: 1, effort: 1, impact: 1, attributes: [], status: 'active', createdAt: NOW, createdLocalDate: '2026-10-01' },
    { id: 3, title: 'Long hike', description: '', type: 'challenge', category: 'health & fitness', difficulty: 4, effort: 5, impact: 4, attributes: ['STR'], scheduledDate: '2026-10-03', status: 'active', createdAt: NOW, createdLocalDate: '2026-10-01' },
    { id: 4, goalId: 1, title: 'Read chapter four', description: '', type: 'main', category: 'reading', difficulty: 3, effort: 3, impact: 3, baseXp: 100, attributes: ['INT'], status: 'completed', createdAt: NOW, createdLocalDate: '2026-09-28', completedAt: NOW, completedLocalDate: '2026-09-30' },
  ])
  await t('habits').bulkPut([
    { id: 1, name: 'Morning run', frequency: 'daily', category: 'health & fitness', difficulty: 3, impact: 3, attributes: ['STR'], archived: false, createdAt: NOW, createdLocalDate: '2026-09-20' },
    { id: 2, goalId: 1, name: 'Read pages', frequency: 'weekly', category: 'learning', difficulty: 2, impact: 4, attributes: ['INT'], archived: false, createdAt: NOW, createdLocalDate: '2026-09-20' },
  ])
  await t('habitLogs').bulkPut([
    { id: 1, habitId: 1, logDate: '2026-09-30', createdAt: NOW },
    { id: 2, habitId: 2, logDate: '2026-09-29', createdAt: NOW },
    { id: 3, habitId: 1, logDate: '2026-09-29', createdAt: NOW },
    { id: 4, habitId: 1, logDate: todayStr(), createdAt: NOW },
  ])
  await t('xpLedger').bulkPut([
    { id: 1, sourceType: 'habit', sourceId: 1, attribute: 'STR', xpAmount: 120, breakdown: breakdown(120), formulaVersion: 1, localDate: '2026-09-30', createdAt: NOW },
    { id: 2, sourceType: 'quest', sourceId: 4, attribute: 'INT', xpAmount: 210, breakdown: breakdown(210), formulaVersion: 1, localDate: '2026-09-30', createdAt: NOW },
    { id: 3, sourceType: 'milestone', sourceId: 1, attribute: 'INT', xpAmount: 150, breakdown: breakdown(150), formulaVersion: 1, localDate: '2026-09-30', createdAt: NOW },
  ])
  await t('healthLogs').bulkPut([
    { id: 1, logDate: '2026-09-28', kind: 'missed_habit', changeAmount: -5, reason: 'Missed: Morning run', healthAfter: 95, lossKey: 'missed_habit:1:2026-09-28', createdAt: NOW },
    { id: 2, logDate: '2026-09-30', kind: 'recovery', changeAmount: 8, reason: 'Recovery quest: Evening walk', healthAfter: 88, createdAt: NOW },
  ])
  await t('timelineEvents').bulkPut([
    { id: 1, eventType: 'profile_created', title: 'Welcome, Legacy User', note: '', localDate: '2026-09-20', createdAt: NOW },
    { id: 2, eventType: 'habit_checkin', refType: 'habit', refId: 1, title: 'Checked in: Morning run', note: '', xpDelta: 120, localDate: '2026-09-30', createdAt: NOW },
    { id: 3, eventType: 'quest_completed', refType: 'quest', refId: 4, title: 'Completed: Read chapter four', note: '', xpDelta: 210, localDate: '2026-09-30', createdAt: NOW },
    { id: 4, eventType: 'milestone_completed', refType: 'milestone', refId: 1, title: 'Milestone completed: Finish book one', note: '', xpDelta: 150, localDate: '2026-09-30', createdAt: NOW },
    { id: 5, eventType: 'level_up', refType: 'profile', refId: 1, title: 'Reached level 5', note: '', localDate: '2026-09-30', createdAt: NOW },
    { id: 6, eventType: 'achievement_unlocked', refType: 'achievement', refId: 0, title: 'Achievement unlocked: First quest', note: '', localDate: '2026-09-30', createdAt: NOW },
    { id: 7, eventType: 'vitality_loss', refType: 'profile', refId: 1, title: 'Missed: Morning run', note: '', healthDelta: -5, localDate: '2026-09-28', createdAt: NOW },
    { id: 8, eventType: 'habit_checkin', refType: 'habit', refId: 1, title: 'Checked in: Morning run', note: '', xpDelta: 15, localDate: todayStr(), createdAt: NOW },
  ])
  await t('achievements').bulkPut([
    { ruleKey: 'first_quest', name: 'First quest', description: 'Complete your first quest', target: 1, unlockedAt: NOW },
    { ruleKey: 'streak_7', name: '7-day streak', description: 'Reach a 7-day streak', target: 7 },
    { ruleKey: 'streak_30', name: '30-day streak', description: 'Reach a 30-day streak', target: 30 },
    { ruleKey: 'quests_10', name: '10 quests', description: 'Complete 10 quests', target: 10 },
    { ruleKey: 'first_goal_completed', name: 'First goal', description: 'Complete your first goal', target: 1 },
  ])
  await t('githubActivity').bulkPut([
    { id: 1, activityDate: '2026-09-30', repoName: 'personal-dashboard', commitCount: 3, syncedAt: NOW },
    { id: 2, activityDate: '2026-09-29', repoName: 'personal-dashboard', commitCount: 1, syncedAt: NOW },
  ])
  await t('settings').bulkPut([
    { key: 'health.max', value: 100, updatedAt: NOW },
    { key: 'health.recoveryDailyLimit', value: 2, updatedAt: NOW },
    { key: 'xp.formulaVersion', value: 1, updatedAt: NOW },
    { key: 'health.lastCheckedDate', value: '2026-09-30', updatedAt: NOW },
    { key: 'calendar.weekStart', value: 'monday', updatedAt: NOW },
    { key: 'github.username', value: 'legacy-user', updatedAt: NOW },
  ])
  await t('chats').bulkPut([
    { id: 1, title: 'Planning', messages: [{ role: 'user', text: 'Plan my week', createdAt: NOW }], createdAt: NOW, updatedAt: NOW },
    { id: 2, title: 'Old tool call', messages: [{ role: 'assistant', text: 'Creating it now. [TOOL:create_quest|title=Old quest]', createdAt: NOW }], createdAt: NOW, updatedAt: NOW },
  ])
  await dexie.close()
}

async function resetDb(name: string): Promise<void> {
  try {
    await Dexie.delete(name)
  } catch {
    // never opened — nothing to delete
  }
}

describe('v2 → v4 migration', () => {
  it('migrates user data, drops RPG stores, and renames quests to tasks', async () => {
    await resetDb(NAME)
    await seedLegacy()

    const db = new LifeOSDb(NAME)
    setDbForTests(db)
    await db.open()
    expect(db.verno).toBe(4)

    // counts identical for kept data
    expect(await db.habits.count()).toBe(2)
    expect(await db.goals.count()).toBe(2)
    expect(await db.milestones.count()).toBe(3)
    expect(await db.habitLogs.count()).toBe(4)
    expect(await db.githubActivity.count()).toBe(2)
    expect(await db.chats.count()).toBe(2)
    expect(await db.table('tasks').count()).toBe(4)

    // task ids equal the old quest ids; recovery quest is an ordinary task
    const tasks = await db.table('tasks').toArray()
    expect(tasks.map((t: { id: number }) => t.id).sort()).toEqual([1, 2, 3, 4])
    const walk = tasks.find((t: { id: number }) => t.id === 2) as Record<string, unknown>
    expect(walk.title).toBe('Evening walk')
    expect(walk.status).toBe('active')
    for (const dropped of ['type', 'difficulty', 'effort', 'impact', 'baseXp', 'attributes']) {
      expect(walk, `task must not have ${dropped}`).not.toHaveProperty(dropped)
    }
    const chapter = tasks.find((t: { id: number }) => t.id === 1) as { goalId: number; milestoneId: number; deadline: string; scheduledDate: string }
    expect(chapter.goalId).toBe(1)
    expect(chapter.milestoneId).toBe(2)
    expect(chapter.deadline).toBe('2026-10-05')
    expect(chapter.scheduledDate).toBe('2026-10-01')

    // links still resolve
    expect((await db.goals.get(1))?.title).toBe('Read more')
    expect((await db.milestones.get(2))?.goalId).toBe(1)
    expect(tasks.every((t: { goalId?: number }) => t.goalId === undefined || t.goalId === 1)).toBe(true)

    // RPG tables no longer exist
    for (const gone of ['quests', 'xpLedger', 'healthLogs', 'attributeStats', 'achievements']) {
      expect(() => db.table(gone)).toThrow()
    }

    // profile keeps identity; current streak is recomputed from the logs
    // (today's log keeps it alive), best streak is a historical max and kept
    const profile = (await db.profile.get(1)) as unknown as Record<string, unknown>
    expect(profile.name).toBe('Legacy User')
    expect(profile.currentStreak as number).toBeGreaterThanOrEqual(1)
    expect(profile.bestStreak).toBe(9)
    for (const dropped of ['level', 'totalXp', 'health', 'maxHealth']) {
      expect(profile, `profile must not have ${dropped}`).not.toHaveProperty(dropped)
    }

    // habits + goals stripped of RPG fields
    const habit = (await db.habits.get(1)) as unknown as Record<string, unknown>
    expect(habit.name).toBe('Morning run')
    expect(habit.category).toBe('health & fitness')
    for (const dropped of ['difficulty', 'impact', 'attributes']) {
      expect(habit, `habit must not have ${dropped}`).not.toHaveProperty(dropped)
    }
    const goal = (await db.goals.get(1)) as unknown as Record<string, unknown>
    expect(goal).not.toHaveProperty('attribute')

    // timeline: removed types gone, renames applied, deltas stripped, order kept
    const events = await db.timelineEvents.orderBy('id').toArray()
    expect(events.map((e) => e.id)).toEqual([1, 2, 3, 4, 8])
    expect(events.map((e) => e.eventType as string).sort()).toEqual(['habit_checkin', 'milestone_completed', 'profile_created', 'task_completed'])
    const completed = events.find((e) => (e.eventType as string) === 'task_completed')!
    expect(completed.refType).toBe('task')
    expect(completed.refId).toBe(4)
    expect(completed.title).toBe('Completed: Read chapter four')
    expect(completed.localDate).toBe('2026-09-30')
    for (const e of events) {
      expect(e as unknown as Record<string, unknown>).not.toHaveProperty('xpDelta')
      expect(e as unknown as Record<string, unknown>).not.toHaveProperty('healthDelta')
    }

    // settings cleaned
    const keys = (await db.settings.toArray()).map((s) => s.key)
    expect(keys).toContain('calendar.weekStart')
    expect(keys).toContain('github.username')
    expect(keys.some((k) => k.startsWith('health.') || k.startsWith('xp.'))).toBe(false)

    // chats untouched (old tool-call text is history, not re-executed)
    expect((await db.chats.get(2))?.messages[0].text).toContain('[TOOL:create_quest')

    // reduced integrity passes on migrated data
    expect(await verifyIntegrity()).toEqual([])

    // opening again changes nothing
    const before = JSON.stringify({
      habits: await db.habits.toArray(),
      tasks,
      goals: await db.goals.toArray(),
      milestones: await db.milestones.toArray(),
      logs: await db.habitLogs.toArray(),
      events,
      settings: await db.settings.toArray(),
      chats: await db.chats.toArray(),
    })
    await db.close()
    const db2 = new LifeOSDb(NAME)
    setDbForTests(db2)
    await db2.open()
    const after = JSON.stringify({
      habits: await db2.habits.toArray(),
      tasks: await db2.table('tasks').toArray(),
      goals: await db2.goals.toArray(),
      milestones: await db2.milestones.toArray(),
      logs: await db2.habitLogs.toArray(),
      events: await db2.timelineEvents.orderBy('id').toArray(),
      settings: await db2.settings.toArray(),
      chats: await db2.chats.toArray(),
    })
    expect(after).toBe(before)
    await db2.close()
    setDbForTests(null as never)
    await resetDb(NAME)
  })

  it('pre-upgrade dump contains every legacy table, passes the old checksum, and imports', async () => {
    await resetDb(NAME)
    await seedLegacy()

    const buildPreUpgradeDump = await requireDumpBuilder()
    const json = await buildPreUpgradeDump(NAME)
    const parsed = JSON.parse(json) as { app: string; schemaVersion: number; tables: Record<string, unknown[]> }
    expect(parsed.app).toBe('LifeOS')
    expect(parsed.schemaVersion).toBe(1)
    // every legacy table incl. the ledger; handles excluded
    for (const t of ['profile', 'attributeStats', 'goals', 'milestones', 'quests', 'habits', 'habitLogs', 'xpLedger', 'healthLogs', 'timelineEvents', 'achievements', 'githubActivity', 'settings', 'chats']) {
      expect(Array.isArray(parsed.tables[t]), `dump must include ${t}`).toBe(true)
    }
    expect((parsed.tables.xpLedger as unknown[]).length).toBe(3)
    expect((parsed.tables.healthLogs as unknown[]).length).toBe(2)

    // the dump imports through the new import path and lands migrated
    await Dexie.delete(NAME)
    const fresh = new LifeOSDb(`mig-import-${Date.now()}`)
    setDbForTests(fresh)
    await fresh.open()
    const res = await importData(json)
    expect(res).toEqual({ ok: true })
    expect(await fresh.table('tasks').count()).toBe(4)
    expect(await fresh.habits.count()).toBe(2)
    expect(await fresh.chats.count()).toBe(2)
    expect(await verifyIntegrity()).toEqual([])
    await fresh.close()
    setDbForTests(null as never)
    await resetDb(NAME)
  })

  it('a throw inside the upgrade leaves the old database intact (transactional)', async () => {
    const name = `mig-rollback-${Date.now()}`
    const dexie = new Dexie(name)
    dexie.version(1).stores({ items: '++id' })
    await dexie.open()
    await dexie.table('items').bulkAdd([{ label: 'a' }, { label: 'b' }])
    await dexie.close()

    // a later version whose upgrade writes and then throws must roll back
    const broken = new Dexie(name)
    broken.version(1).stores({ items: '++id' })
    broken.version(2).stores({ items: '++id', extra: '++id' }).upgrade(() => {
      throw new Error('simulated upgrade failure')
    })
    await expect(broken.open()).rejects.toThrow('simulated upgrade failure')
    broken.close()

    const reopened = new Dexie(name)
    reopened.version(1).stores({ items: '++id' })
    await reopened.open()
    expect(reopened.verno).toBe(1)
    expect(await reopened.table('items').count()).toBe(2)
    reopened.close()
    await Dexie.delete(name)
  })
})
