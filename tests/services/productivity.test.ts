/**
 * Surviving-behavior safety net (§11): non-RPG behavior that must keep
 * working before, during, and after the RPG removal.
 *
 * GREEN in Phase 1 (written against the current API). Renames in Phase 3/4
 * update these tests alongside the code they cover.
 */
import { describe, expect, it, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { LifeOSDb, setDbForTests } from '../../src/core/db/db'
import { createProfile } from '../../src/core/repo/profile'
import { checkInHabit, completeMilestone, completeQuest } from '../../src/core/services/completion'
import { getSetting, setSetting } from '../../src/core/settings/repo'
import { listHabitItems, listQuestItems } from '../../src/data/views'
import { dailyStreak, weeklyStreak } from '../../src/core/domain/streak'
import { addDaysLocal, localDate, weekStartOf } from '../../src/core/domain/time'

let db: LifeOSDb
const today = () => localDate(new Date())

beforeEach(async () => {
  db = new LifeOSDb(`prod-${Math.random().toString(36).slice(2)}`)
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

async function addHabit(frequency: 'daily' | 'weekly' = 'daily', name = 'Run') {
  return db.habits.add({ name, frequency, category: 'fitness', difficulty: 1, impact: 1, attributes: [], archived: false, createdAt: new Date().toISOString(), createdLocalDate: today() })
}

describe('habit check-in rules (survive removal)', () => {
  it('daily habit checks in once per day', async () => {
    const id = await addHabit()
    const res = await checkInHabit(id)
    expect(res.streak.current).toBeGreaterThanOrEqual(1)
    await expect(checkInHabit(id)).rejects.toThrow(/ALREADY_CHECKED_IN/)
    expect(await db.habitLogs.where('habitId').equals(id).count()).toBe(1)
    await cleanup()
  })

  it('weekly habit checks in once per week, allowed across week boundary', async () => {
    const id = await addHabit('weekly', 'Read pages')
    await checkInHabit(id)
    const yesterday = addDaysLocal(today(), -1)
    if (weekStartOf(yesterday) === weekStartOf(today())) {
      await expect(checkInHabit(id, yesterday)).rejects.toThrow(/ALREADY_CHECKED_IN/)
    } else {
      // today is Monday: yesterday belongs to the previous week
      await checkInHabit(id, yesterday)
      expect(await db.habitLogs.where('habitId').equals(id).count()).toBe(2)
    }
    await cleanup()
  })

  it('check-in older than yesterday is rejected', async () => {
    const id = await addHabit()
    await expect(checkInHabit(id, '2020-01-01')).rejects.toThrow(/VALIDATION/)
    await cleanup()
  })
})

describe('streak rules (survive removal)', () => {
  it('daily streak: gap day breaks the chain, missing today still counts yesterday', () => {
    const t = '2026-10-08' // a Thursday
    expect(dailyStreak(new Set(['2026-10-06', '2026-10-08']), t)).toBe(1)
    expect(dailyStreak(new Set(['2026-10-06', '2026-10-07']), t)).toBe(2)
    expect(dailyStreak(new Set(['2026-10-01']), t)).toBe(0)
  })

  it('weekly streak holds across week and month boundaries', () => {
    // consecutive weeks across a month boundary, ending this week
    const t = '2026-10-08'
    expect(weeklyStreak(new Set(['2026-09-22', '2026-09-29', '2026-10-08']), t, 'monday')).toBe(3)
    expect(weeklyStreak(new Set(['2026-09-22', '2026-10-08']), t, 'monday')).toBe(1)
  })
})

describe('task/quest completion transaction (survives removal)', () => {
  it('completing writes status, date, and timeline event atomically', async () => {
    const id = await db.quests.add({ title: 'Read chapter', description: '', type: 'side', category: 'reading', difficulty: 2, effort: 2, impact: 2, attributes: [], status: 'active', createdAt: new Date().toISOString(), createdLocalDate: today() })
    await completeQuest(id)
    const q = await db.quests.get(id)
    expect(q!.status).toBe('completed')
    expect(q!.completedLocalDate).toBe(today())
    const events = await db.timelineEvents.where('eventType').equals('quest_completed').toArray()
    expect(events.length).toBe(1)
    expect(events[0].refId).toBe(id)
    await cleanup()
  })

  it('failed completion leaves no partial writes', async () => {
    const id = await db.quests.add({ title: 'Read chapter', description: '', type: 'side', category: 'reading', difficulty: 1, effort: 1, impact: 1, attributes: [], status: 'active', createdAt: new Date().toISOString(), createdLocalDate: today() })
    await expect(completeQuest(999_999)).rejects.toThrow(/NOT_FOUND/)
    await completeQuest(id)
    await expect(completeQuest(id)).rejects.toThrow(/ALREADY_COMPLETED/)
    expect(await db.timelineEvents.where('eventType').equals('quest_completed').count()).toBe(1)
    await cleanup()
  })

  it('last milestone completes the goal; double completion is blocked', async () => {
    const goalId = await db.goals.add({ title: 'G', description: '', category: 'learning', status: 'active', createdAt: new Date().toISOString() })
    const m1 = await db.milestones.add({ goalId, title: 'M1', orderIndex: 0, status: 'pending' })
    const m2 = await db.milestones.add({ goalId, title: 'M2', orderIndex: 1, status: 'pending' })
    const r1 = await completeMilestone(m1)
    expect(r1.goalProgress?.goalCompleted).not.toBe(true)
    expect((await db.goals.get(goalId))!.status).toBe('active')
    const r2 = await completeMilestone(m2)
    expect(r2.goalProgress?.goalCompleted).toBe(true)
    expect((await db.goals.get(goalId))!.status).toBe('completed')
    await expect(completeMilestone(m2)).rejects.toThrow(/ALREADY_COMPLETED/)
    await cleanup()
  })
})

describe('timeline paging (survives removal)', () => {
  it('shows every event exactly once across pages', async () => {
    const id = await addHabit()
    await checkInHabit(id)
    const total = await db.timelineEvents.count()
    expect(total).toBeGreaterThan(0)
    const pageSize = 2
    const seen = new Set<number>()
    for (let offset = 0; offset < total; offset += pageSize) {
      const page = await db.timelineEvents.orderBy('id').offset(offset).limit(pageSize).toArray()
      for (const e of page) {
        expect(seen.has(e.id!)).toBe(false)
        seen.add(e.id!)
      }
    }
    expect(seen.size).toBe(total)
    await cleanup()
  })
})

describe('dashboard summary inputs (survive removal)', () => {
  it('habits-today done/total and task deadlines derive from existing views', async () => {
    const doneId = await addHabit('daily', 'Done habit')
    await addHabit('daily', 'Open habit')
    await checkInHabit(doneId)
    const items = await listHabitItems('today')
    expect(items.filter((h) => h.done).length).toBe(1)
    expect(items.length).toBe(2)

    const t = today()
    await db.quests.add({ title: 'Due today', description: '', type: 'side', category: 'general', difficulty: 1, effort: 1, impact: 1, attributes: [], deadline: t, status: 'active', createdAt: new Date().toISOString(), createdLocalDate: t })
    await db.quests.add({ title: 'Overdue', description: '', type: 'side', category: 'general', difficulty: 1, effort: 1, impact: 1, attributes: [], deadline: addDaysLocal(t, -2), status: 'active', createdAt: new Date().toISOString(), createdLocalDate: addDaysLocal(t, -3) })
    await db.quests.add({ title: 'Future', description: '', type: 'side', category: 'general', difficulty: 1, effort: 1, impact: 1, attributes: [], deadline: addDaysLocal(t, 5), status: 'active', createdAt: new Date().toISOString(), createdLocalDate: t })
    const quests = await listQuestItems()
    expect(quests.filter((q) => q.deadline === t).length).toBe(1)
    expect(quests.filter((q) => q.deadline !== undefined && q.deadline < t).length).toBe(1)
    await cleanup()
  })
})

describe('settings validation (survives removal)', () => {
  it('rejects unknown keys and invalid values; kept keys keep working', async () => {
    await expect(setSetting('nope', 1)).rejects.toThrow(/Unknown/)
    await setSetting('calendar.weekStart', 'sunday')
    expect(await getSetting('calendar.weekStart')).toBe('sunday')
    await expect(setSetting('calendar.weekStart', 'friday')).rejects.toThrow(/Invalid/)
    await cleanup()
  })
})
