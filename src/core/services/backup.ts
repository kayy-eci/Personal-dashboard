import { getDb } from '../db/db'
import { REMOVED_EVENT_TYPES, isRemovedSettingKey, questToTask, refreshProfileStreakCache } from '../db/migration'
import { verifyIntegrity } from './integrity'

export const BACKUP_TABLES = [
  'profile',
  'goals',
  'milestones',
  'tasks',
  'habits',
  'habitLogs',
  'timelineEvents',
  'githubActivity',
  'settings',
  'chats',
] as const

/** Tables of the legacy v1 export format (quests era). */
const LEGACY_TABLES = [
  'profile',
  'attributeStats',
  'goals',
  'milestones',
  'quests',
  'habits',
  'habitLogs',
  'xpLedger',
  'healthLogs',
  'timelineEvents',
  'achievements',
  'githubActivity',
  'settings',
] as const

interface BackupFile {
  app: 'LifeOS'
  schemaVersion: number
  formulaVersion?: number
  exportedAt: string
  checksum: string
  tables: Record<string, unknown[]>
}

const GITHUB_TOKEN_KEY = 'github.token'

async function checksumOf(tables: Record<string, unknown[]>): Promise<string> {
  const canonical = JSON.stringify(tables)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function exportData(): Promise<string> {
  const db = getDb()
  const tables: Record<string, unknown[]> = {}
  for (const t of BACKUP_TABLES) {
    const rows = await (db[t as keyof typeof db] as { toArray(): Promise<unknown[]> }).toArray()
    tables[t] = t === 'settings' ? rows.filter((r) => (r as { key: string }).key !== GITHUB_TOKEN_KEY) : rows
  }
  const payload: BackupFile = {
    app: 'LifeOS',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    checksum: await checksumOf(tables),
    tables,
  }
  return JSON.stringify(payload, null, 2)
}

export async function validateBackup(json: string): Promise<{ ok: true; data: BackupFile } | { ok: false; error: string }> {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Not valid JSON' }
  }
  if (parsed.app !== 'LifeOS') return { ok: false, error: 'Wrong app name' }
  if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion < 1 || parsed.schemaVersion > 2) {
    return { ok: false, error: 'Unsupported schema version' }
  }
  if (!parsed.tables || typeof parsed.tables !== 'object') return { ok: false, error: 'Missing tables' }
  const required = parsed.schemaVersion === 1 ? LEGACY_TABLES : BACKUP_TABLES
  for (const t of required) if (!Array.isArray(parsed.tables[t])) return { ok: false, error: `Missing table ${t}` }
  // checksum is always validated on the ORIGINAL content first
  if ((await checksumOf(parsed.tables)) !== parsed.checksum) return { ok: false, error: 'Checksum mismatch' }
  return { ok: true, data: parsed }
}

function stripRecord(row: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
  const out = { ...row }
  for (const k of keys) delete out[k]
  return out
}

/** Transform a validated v1 payload into v2 table rows (same rules as the v2→v3 upgrade). */
export function migrateLegacyBackup(tables: Record<string, unknown[]>): Record<string, unknown[]> {
  const quests = (tables.quests ?? []) as (Record<string, unknown> & { id: number })[]
  const habits = (tables.habits ?? []) as Record<string, unknown>[]
  const goals = (tables.goals ?? []) as Record<string, unknown>[]
  const profiles = (tables.profile ?? []) as Record<string, unknown>[]
  const events = (tables.timelineEvents ?? []) as Record<string, unknown>[]
  const settings = (tables.settings ?? []) as { key: string }[]

  const out: Record<string, unknown[]> = {}
  out.profile = profiles.map((p) => stripRecord(p, 'level', 'totalXp', 'health', 'maxHealth'))
  out.goals = goals.map((g) => stripRecord(g, 'attribute'))
  out.milestones = [...(tables.milestones ?? [])]
  out.tasks = quests.map((q) => questToTask(q))
  out.habits = habits.map((h) => stripRecord(h, 'difficulty', 'impact', 'attributes'))
  out.habitLogs = [...(tables.habitLogs ?? [])]
  out.timelineEvents = events
    .filter((e) => !REMOVED_EVENT_TYPES.has(e.eventType as string))
    .map((e) => {
      const row = { ...e }
      if (row.eventType === 'quest_completed') row.eventType = 'task_completed'
      if (row.refType === 'quest') row.refType = 'task'
      delete row.xpDelta
      delete row.healthDelta
      return row
    })
  out.githubActivity = [...(tables.githubActivity ?? [])]
  out.settings = settings.filter((s) => !isRemovedSettingKey(s.key))
  out.chats = [...(tables.chats ?? [])]
  return out
}

/** Replace all data with the backup's rows. Caller must confirm first. */
export async function importData(json: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const check = await validateBackup(json)
  if (!check.ok) return check
  const tables = check.data.schemaVersion === 1 ? migrateLegacyBackup(check.data.tables) : check.data.tables
  // shape check before touching data: every new table present and well-formed
  for (const t of BACKUP_TABLES) {
    if (t === 'chats') continue // v1 files predate chats
    if (!Array.isArray(tables[t])) return { ok: false, error: `Missing table ${t}` }
  }
  const db = getDb()
  await db.close()
  await db.delete()
  await db.open()
  await db.transaction('rw', BACKUP_TABLES as never, async () => {
    for (const t of BACKUP_TABLES) {
      const rows = (tables[t] ?? []) as object[]
      if (rows.length > 0) await (db[t as keyof typeof db] as { bulkAdd(v: object[]): Promise<unknown> }).bulkAdd(rows)
    }
  })
  // streak caches are derived data: refresh them before verifying
  await refreshProfileStreakCache(db)
  const problems = await verifyIntegrity()
  if (problems.length > 0) return { ok: false, error: `Integrity problems after import: ${problems.join('; ')}` }
  return { ok: true }
}
