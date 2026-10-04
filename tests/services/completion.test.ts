import { describe, expect, it, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { LifeOSDb, seedDatabase, setDbForTests } from '../../src/core/db/db'
import { createProfile } from '../../src/core/repo/profile'
import { checkInHabit, completeMilestone, completeQuest } from '../../src/core/services/completion'
import { localDate } from '../../src/core/domain/time'

let db: LifeOSDb

beforeEach(async () => {
  db = new LifeOSDb(`t-${Math.random().toString(36).slice(2)}`)
  setDbForTests(db)
  await seedDatabase(db)
  await createProfile('Tester')
})

async function cleanup() {
  await db.close()
  await Dexie.delete(db.name)
}

describe('completion pipeline', () => {
  it('checkInHabit awards XP, updates caches and timeline', async () => {
    const habitId = await db.habits.add({ name: 'Run', frequency: 'daily', category: 'fitness', difficulty: 3, impact: 3, attributes: ['STR'], archived: false, createdAt: new Date().toISOString(), createdLocalDate: localDate(new Date()) })
    const res = await checkInHabit(habitId)
    expect(res.xpGained).toBeGreaterThan(0)
    const profile = await db.profile.get(1)
    const ledgerSum = (await db.xpLedger.toArray()).reduce((s, r) => s + r.xpAmount, 0)
    expect(profile!.totalXp).toBe(ledgerSum)
    const str = await db.attributeStats.get('STR')
    expect(str!.xp).toBe(ledgerSum)
    const events = await db.timelineEvents.toArray()
    expect(events.some((e) => e.eventType === 'habit_checkin')).toBe(true)
    await cleanup()
  })

  it('double check-in is blocked', async () => {
    const habitId = await db.habits.add({ name: 'Run', frequency: 'daily', category: 'fitness', difficulty: 3, impact: 3, attributes: ['STR'], archived: false, createdAt: new Date().toISOString(), createdLocalDate: localDate(new Date()) })
    await checkInHabit(habitId)
    await expect(checkInHabit(habitId)).rejects.toThrow(/ALREADY_CHECKED_IN/)
    await cleanup()
  })

  it('check-in older than yesterday is rejected', async () => {
    const habitId = await db.habits.add({ name: 'Run', frequency: 'daily', category: 'fitness', difficulty: 3, impact: 3, attributes: ['STR'], archived: false, createdAt: new Date().toISOString(), createdLocalDate: localDate(new Date()) })
    await expect(checkInHabit(habitId, '2020-01-01')).rejects.toThrow(/VALIDATION/)
    await cleanup()
  })

  it('completeQuest updates quest, xp, streaks and achievements path', async () => {
    const questId = await db.quests.add({ title: 'Read chapter', description: '', type: 'side', category: 'reading', difficulty: 2, effort: 2, impact: 2, attributes: ['INT'], status: 'active', createdAt: new Date().toISOString(), createdLocalDate: localDate(new Date()) })
    const res = await completeQuest(questId)
    expect(res.xpGained).toBeGreaterThan(0)
    const q = await db.quests.get(questId)
    expect(q!.status).toBe('completed')
    await expect(completeQuest(questId)).rejects.toThrow(/ALREADY_COMPLETED/)
    await cleanup()
  })

  it('recovery quest restores vitality and respects the daily limit', async () => {
    await db.profile.update(1, { health: 50 })
    for (let i = 0; i < 2; i++) {
      const id = await db.quests.add({ title: `Walk ${i}`, description: '', type: 'recovery', category: 'health', difficulty: 1, effort: 1, impact: 1, attributes: [], status: 'active', createdAt: new Date().toISOString(), createdLocalDate: localDate(new Date()) })
      const r = await completeQuest(id)
      expect(r.vitalityChange).not.toBeNull()
    }
    const profile = await db.profile.get(1)
    expect(profile!.health).toBe(50 + 16)
    const third = await db.quests.add({ title: 'Walk 3', description: '', type: 'recovery', category: 'health', difficulty: 1, effort: 1, impact: 1, attributes: [], status: 'active', createdAt: new Date().toISOString(), createdLocalDate: localDate(new Date()) })
    await expect(completeQuest(third)).rejects.toThrow(/RECOVERY_LIMIT_REACHED/)
    await cleanup()
  })

  it('last milestone completes the goal and awards the bonus once', async () => {
    const goalId = await db.goals.add({ title: 'G', description: '', category: 'learning', attribute: 'INT', status: 'active', createdAt: new Date().toISOString() })
    const m1 = await db.milestones.add({ goalId, title: 'M1', orderIndex: 0, status: 'pending' })
    const m2 = await db.milestones.add({ goalId, title: 'M2', orderIndex: 1, status: 'pending' })
    await completeMilestone(m1)
    let goal = await db.goals.get(goalId)
    expect(goal!.status).toBe('active')
    const r2 = await completeMilestone(m2)
    goal = await db.goals.get(goalId)
    expect(goal!.status).toBe('completed')
    expect(r2.goalProgress?.goalCompleted).toBe(true)
    const ledgerGoalRows = (await db.xpLedger.toArray()).filter((r) => r.sourceType === 'goal')
    expect(ledgerGoalRows.length).toBe(1)
    await expect(completeMilestone(m2)).rejects.toThrow(/ALREADY_COMPLETED/)
    await cleanup()
  })
})
