import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { LifeOSDb, seedDatabase } from '../../src/core/db/db'
import { setDbForTests } from '../../src/core/db/db'
import { inTx } from '../../src/core/db/tx'
import { getSetting, setSetting } from '../../src/core/settings/repo'

function freshDb(): LifeOSDb {
  const db = new LifeOSDb(`test-${Math.random().toString(36).slice(2)}`)
  setDbForTests(db)
  return db
}

describe('database', () => {
  it('enforces unique habit log per day and lossKey uniqueness', async () => {
    const db = freshDb()
    await db.habitLogs.add({ habitId: 1, logDate: '2026-10-01', createdAt: new Date().toISOString() })
    await expect(
      db.habitLogs.add({ habitId: 1, logDate: '2026-10-01', createdAt: new Date().toISOString() }),
    ).rejects.toThrow()
    await db.healthLogs.add({ logDate: 'd', kind: 'missed_habit', changeAmount: -5, reason: 'r', healthAfter: 90, lossKey: 'd:missed_habit', createdAt: new Date().toISOString() })
    await expect(
      db.healthLogs.add({ logDate: 'd', kind: 'missed_habit', changeAmount: -5, reason: 'r', healthAfter: 85, lossKey: 'd:missed_habit', createdAt: new Date().toISOString() }),
    ).rejects.toThrow()
    // recovery rows without lossKey coexist
    await db.healthLogs.add({ logDate: 'd', kind: 'recovery', changeAmount: 8, reason: 'r', healthAfter: 93, createdAt: new Date().toISOString() })
    await db.close()
    await Dexie.delete(db.name)
  })

  it('ledger cannot be updated or deleted', async () => {
    const db = freshDb()
    const id = await db.xpLedger.add({ sourceType: 'habit', sourceId: 1, attribute: 'STR', xpAmount: 10, breakdown: {} as never, formulaVersion: 1, localDate: '2026-10-01', createdAt: new Date().toISOString() })
    await expect(db.xpLedger.update(id, { xpAmount: 99 })).rejects.toThrow(/append-only/)
    await expect(db.xpLedger.delete(id)).rejects.toThrow(/append-only/)
    await db.close()
    await Dexie.delete(db.name)
  })

  it('transaction rollback leaves no partial writes', async () => {
    const db = freshDb()
    await expect(
      inTx([db.goals, db.milestones], async () => {
        await db.goals.add({ title: 't', description: '', category: 'c', status: 'active', createdAt: new Date().toISOString() })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await db.goals.count()).toBe(0)
    await db.close()
    await Dexie.delete(db.name)
  })

  it('settings validation rejects unknown and invalid keys', async () => {
    freshDb()
    await expect(setSetting('nope', 1)).rejects.toThrow(/Unknown/)
    await expect(setSetting('health.max', 5)).rejects.toThrow(/Invalid/)
    await setSetting('health.max', 120)
    expect(await getSetting<number>('health.max')).toBe(120)
    expect(await getSetting('appearance.theme')).toBe('system')
    await expect(setSetting('dashboard.hiddenSections', ['hud'])).rejects.toThrow(/Invalid/)
  })

  it('seed creates six attribute rows and five achievements', async () => {
    const db = freshDb()
    await seedDatabase(db)
    expect(await db.attributeStats.count()).toBe(6)
    expect(await db.achievements.count()).toBe(5)
    await db.close()
    await Dexie.delete(db.name)
  })
})
