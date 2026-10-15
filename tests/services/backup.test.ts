import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { LifeOSDb, seedDatabase, setDbForTests } from '../../src/core/db/db'
import { createProfile } from '../../src/core/repo/profile'
import { exportData, importData, validateBackup } from '../../src/core/services/backup'
import { verifyIntegrity } from '../../src/core/services/integrity'
import { setSetting } from '../../src/core/settings/repo'
import { checkInHabit } from '../../src/core/services/completion'
import { createChatSession, addChatMessage } from '../../src/data/chats'
import { localDate } from '../../src/core/domain/time'

describe('backup export/import', () => {
  it('round trip restores identical data and passes integrity', async () => {
    const db = new LifeOSDb('lifeos')
    setDbForTests(db)
    await seedDatabase(db)
    await createProfile('RoundTrip')
    await db.habits.add({ name: 'Run', frequency: 'daily', category: 'fitness', difficulty: 3, impact: 3, attributes: ['STR'], archived: false, createdAt: new Date().toISOString(), createdLocalDate: localDate(new Date()) })
    await checkInHabit(1)
    const chatId = await createChatSession()
    await addChatMessage(chatId, 'user', 'Plan my week')
    await setSetting('github.token', 'secret-token')

    const json = await exportData()
    const parsed = JSON.parse(json)
    expect(parsed.schemaVersion).toBe(2)
    // RPG tables are not exported anymore
    for (const gone of ['xpLedger', 'healthLogs', 'attributeStats', 'achievements', 'quests']) {
      expect(parsed.tables).not.toHaveProperty(gone)
    }
    expect(parsed.tables).toHaveProperty('tasks')
    const settingsRows = parsed.tables.settings as { key: string }[]
    expect(settingsRows.some((r) => r.key === 'github.token')).toBe(false)

    await db.close()
    await db.delete()
    setDbForTests(null as never)

    const db2 = new LifeOSDb('lifeos')
    setDbForTests(db2)
    const res = await importData(json)
    expect(res).toEqual({ ok: true })
    const profile = await db2.profile.get(1)
    expect(profile?.name).toBe('RoundTrip')
    const chat = await db2.chats.get(chatId)
    expect(chat?.messages.map((m) => m.text)).toEqual(['Plan my week'])
    expect(await verifyIntegrity()).toEqual([])
    await db2.close()
    await Dexie.delete('lifeos')
  })

  it('rejects wrong app, newer version, missing tables, checksum mismatch', async () => {
    const db = new LifeOSDb(`t-${Math.random().toString(36).slice(2)}`)
    setDbForTests(db)
    await seedDatabase(db)
    await createProfile('X')
    const json = await exportData()
    const ok = JSON.parse(json)

    expect((await validateBackup(JSON.stringify({ ...ok, app: 'Other' }))).ok).toBe(false)
    expect((await validateBackup(JSON.stringify({ ...ok, schemaVersion: 99 }))).ok).toBe(false)
    const missing = { ...ok, tables: { ...ok.tables, profile: undefined } }
    expect((await validateBackup(JSON.stringify(missing))).ok).toBe(false)
    const badChecksum = { ...ok, checksum: '00'.repeat(32) }
    expect((await validateBackup(JSON.stringify(badChecksum))).ok).toBe(false)

    // importing a bad file must not touch existing data
    expect((await importData(JSON.stringify(badChecksum))).ok).toBe(false)
    expect((await db.profile.get(1))?.name).toBe('X')
    await db.close()
    await Dexie.delete(db.name)
  })
})
