import { describe, expect, it, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { LifeOSDb, seedDatabase, setDbForTests } from '../../src/core/db/db'
import { createProfile } from '../../src/core/repo/profile'
import { runDailyCheck } from '../../src/core/services/vitality'
import { localDate } from '../../src/core/domain/time'

let db: LifeOSDb

beforeEach(async () => {
  db = new LifeOSDb(`t-${Math.random().toString(36).slice(2)}`)
  setDbForTests(db)
  await seedDatabase(db)
  await createProfile('T')
  const today = localDate(new Date())
  // set last checked to 4 days ago so 3 full missed days exist
  const d = new Date()
  d.setDate(d.getDate() - 4)
  const { setSetting } = await import('../../src/core/settings/repo')
  await setSetting('health.lastCheckedDate', localDate(d))
  void today
})

async function cleanup() {
  await db.close()
  await Dexie.delete(db.name)
}

describe('vitality daily check', () => {
  it('applies losses once per missed day and is idempotent on rerun', async () => {
    // two daily habits scheduled all along, no logs
    const created = localDate(new Date(Date.now() - 10 * 86400000))
    await db.habits.add({ name: 'A', frequency: 'daily', category: 'fitness', difficulty: 3, impact: 3, attributes: [], archived: false, createdAt: new Date().toISOString(), createdLocalDate: created })
    await db.habits.add({ name: 'B', frequency: 'daily', category: 'fitness', difficulty: 3, impact: 3, attributes: [], archived: false, createdAt: new Date().toISOString(), createdLocalDate: created })
    const r1 = await runDailyCheck(new Date())
    expect(r1.daysProcessed).toBeGreaterThanOrEqual(3)
    const profile = await db.profile.get(1)
    const hpAfterFirst = profile!.health
    expect(hpAfterFirst).toBeLessThan(100)
    const r2 = await runDailyCheck(new Date())
    expect(r2.daysProcessed).toBe(0)
    expect((await db.profile.get(1))!.health).toBe(hpAfterFirst)
    await cleanup()
  })

  it('weekly habits are never counted', async () => {
    const created = localDate(new Date(Date.now() - 10 * 86400000))
    await db.habits.add({ name: 'Weekly', frequency: 'weekly', category: 'fitness', difficulty: 3, impact: 3, attributes: [], archived: false, createdAt: new Date().toISOString(), createdLocalDate: created })
    await runDailyCheck(new Date())
    const losses = (await db.healthLogs.toArray()).filter((h) => h.kind === 'missed_habit')
    expect(losses.length).toBe(0)
    await cleanup()
  })

  it('habit created after the missed date is not counted for it', async () => {
    const recent = localDate(new Date(Date.now() - 1 * 86400000))
    await db.habits.add({ name: 'New', frequency: 'daily', category: 'fitness', difficulty: 3, impact: 3, attributes: [], archived: false, createdAt: new Date().toISOString(), createdLocalDate: recent })
    await runDailyCheck(new Date())
    const losses = (await db.healthLogs.toArray()).filter((h) => h.kind === 'missed_habit')
    const total = losses.reduce((s, l) => s + (-l.changeAmount), 0)
    // only yesterday can be lost (1 habit * 5), older days must not count this habit
    expect(total).toBeLessThanOrEqual(5)
    await cleanup()
  })

  it('quest due that day and never completed counts as missed', async () => {
    const yesterday = localDate(new Date(Date.now() - 86400000))
    await db.quests.add({ title: 'Q', description: '', type: 'side', category: 'x', difficulty: 2, effort: 2, impact: 2, attributes: [], status: 'active', deadline: yesterday, createdAt: new Date().toISOString(), createdLocalDate: localDate(new Date(Date.now() - 5 * 86400000)) })
    await runDailyCheck(new Date())
    const losses = (await db.healthLogs.toArray()).filter((h) => h.kind === 'missed_quest')
    expect(losses.length).toBe(1)
    expect(losses[0].logDate).toBe(yesterday)
    await cleanup()
  })

  it('does not run for today', async () => {
    const { setSetting } = await import('../../src/core/settings/repo')
    await setSetting('health.lastCheckedDate', localDate(new Date()))
    const r = await runDailyCheck(new Date())
    expect(r.daysProcessed).toBe(0)
    await cleanup()
  })
})
