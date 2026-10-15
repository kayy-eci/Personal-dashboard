/**
 * Old-backup import (§8.3, §11): a v1 export file must validate on its
 * original checksum, transform in memory (quests → tasks, RPG stripped),
 * and land migrated with integrity passing.
 *
 * RED in Phase 1: the new import path does not accept v1 files yet.
 */
import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import fixture from '../fixtures/legacy-backup-v1.json?raw'
import { LifeOSDb, setDbForTests } from '../../src/core/db/db'
import { importData, validateBackup } from '../../src/core/services/backup'
import { verifyIntegrity } from '../../src/core/services/integrity'

describe('legacy v1 backup import', () => {
  it('validates the original checksum, migrates, and passes integrity', async () => {
    // original checksum validates on original content
    const check = await validateBackup(fixture)
    expect(check.ok).toBe(true)

    const name = `legacy-import-${Date.now()}`
    const db = new LifeOSDb(name)
    setDbForTests(db)
    await db.open()

    const res = await importData(fixture)
    expect(res).toEqual({ ok: true })

    // quests became tasks with identical ids; recovery quest is ordinary
    expect(await db.table('tasks').count()).toBe(3)
    const ids = (await db.table('tasks').toArray()).map((t: { id: number }) => t.id).sort()
    expect(ids).toEqual([1, 2, 3])
    const walk = (await db.table('tasks').get(2)) as unknown as Record<string, unknown>
    expect(walk.title).toBe('Evening walk')
    expect(walk.status).toBe('active')
    for (const dropped of ['type', 'difficulty', 'effort', 'impact', 'baseXp', 'attributes']) {
      expect(walk).not.toHaveProperty(dropped)
    }

    // kept data intact (v1 files predate the chats table, so chats land empty)
    expect(await db.habits.count()).toBe(2)
    expect(await db.habitLogs.count()).toBe(2)
    expect(await db.chats.count()).toBe(0)

    // no RPG tables, fields, or settings keys anywhere
    for (const gone of ['quests', 'xpLedger', 'healthLogs', 'attributeStats', 'achievements']) {
      expect(() => db.table(gone)).toThrow()
    }
    expect(await db.habits.filter((h) => 'difficulty' in (h as object)).count()).toBe(0)
    const keys = (await db.settings.toArray()).map((s) => s.key)
    expect(keys.some((k) => k.startsWith('health.') || k.startsWith('xp.'))).toBe(false)

    // timeline migrated: level_up gone, quest_completed renamed, deltas stripped
    const types = (await db.timelineEvents.toArray()).map((e) => e.eventType as string)
    expect(types).not.toContain('level_up')
    expect(types).not.toContain('vitality_loss')
    expect(types).toContain('task_completed')

    expect(await verifyIntegrity()).toEqual([])

    await db.close()
    setDbForTests(null as never)
    await Dexie.delete(name)
  })

  it('still rejects corrupt, wrong-app, or newer-version files without touching data', async () => {
    const name = `legacy-reject-${Date.now()}`
    const db = new LifeOSDb(name)
    setDbForTests(db)
    await db.open()
    await db.table('profile').put({ id: 1, name: 'Keep me', currentStreak: 0, bestStreak: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

    const parsed = JSON.parse(fixture)
    expect((await importData(JSON.stringify({ ...parsed, app: 'Other' }))).ok).toBe(false)
    expect((await importData(JSON.stringify({ ...parsed, schemaVersion: 99 }))).ok).toBe(false)
    expect((await importData(JSON.stringify({ ...parsed, checksum: '00'.repeat(32) }))).ok).toBe(false)

    expect((await db.profile.get(1))?.name).toBe('Keep me')
    await db.close()
    setDbForTests(null as never)
    await Dexie.delete(name)
  })
})
