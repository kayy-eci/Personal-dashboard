import { getDb } from '../db/db'
import { LEDGER_GUARD } from '../db/db'

export const BACKUP_TABLES = [
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
  formulaVersion: number
  exportedAt: string
  checksum: string
  tables: Record<string, unknown[]>
}

const GITHUB_TOKEN_KEY = 'github.token'

export async function exportData(): Promise<string> {
  const db = getDb()
  const tables: Record<string, unknown[]> = {}
  for (const t of BACKUP_TABLES) {
    const rows = await (db[t as keyof typeof db] as { toArray(): Promise<unknown[]> }).toArray()
    tables[t] = t === 'settings' ? rows.filter((r) => (r as { key: string }).key !== GITHUB_TOKEN_KEY) : rows
  }
  const canonical = JSON.stringify(tables)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  const checksum = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  const payload: BackupFile = {
    app: 'LifeOS',
    schemaVersion: 1,
    formulaVersion: 1,
    exportedAt: new Date().toISOString(),
    checksum,
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
  if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion > 1) return { ok: false, error: 'Unsupported schema version' }
  if (!parsed.tables || typeof parsed.tables !== 'object') return { ok: false, error: 'Missing tables' }
  for (const t of BACKUP_TABLES) if (!Array.isArray(parsed.tables[t])) return { ok: false, error: `Missing table ${t}` }
  // checksum over stored tables (which exclude the token at export time)
  const canonical = JSON.stringify(parsed.tables)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (hex !== parsed.checksum) return { ok: false, error: 'Checksum mismatch' }
  return { ok: true, data: parsed }
}

/** Replace all data with the backup's rows. Caller must confirm first. */
export async function importData(json: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const check = await validateBackup(json)
  if (!check.ok) return check
  const db = getDb()
  await db.close()
  await db.delete()
  await db.open()
  LEDGER_GUARD.allowWrites = true
  try {
    await db.transaction('rw', BACKUP_TABLES as never, async () => {
      for (const t of BACKUP_TABLES) {
        const rows = check.data.tables[t] as object[]
        if (rows.length > 0) await (db[t as keyof typeof db] as { bulkAdd(v: object[]): Promise<unknown> }).bulkAdd(rows)
      }
    })
  } finally {
    LEDGER_GUARD.allowWrites = false
  }
  return { ok: true }
}
