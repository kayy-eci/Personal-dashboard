/**
 * Pre-upgrade backup (§8.2): before the app opens the new Dexie schema, dump
 * every table of the existing database into the old export shape so the new
 * import path can always restore it.
 *
 * Returns null when there is nothing to back up (fresh install or an
 * already-migrated database). Never touches the real schema.
 */
import Dexie from 'dexie'

const GITHUB_TOKEN_KEY = 'github.token'

/** Legacy table order; `chats` (v2) appended. `handles` is never dumped. */
const DUMP_ORDER = [
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
  'chats',
]

async function checksumOf(tables: Record<string, unknown[]>): Promise<string> {
  const canonical = JSON.stringify(tables)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Dump the existing database (any old version) into old-format export JSON.
 * Opens a schema-less probe so the current version's stores are read as-is.
 */
export async function buildPreUpgradeDump(dbName = 'lifeos'): Promise<string | null> {
  if (!(await Dexie.exists(dbName))) return null
  const probe = new Dexie(dbName)
  await probe.open()
  try {
    if (probe.verno >= 3) return null
    const present = new Set(probe.tables.map((t) => t.name))
    if (present.size === 0) return null
    const tables: Record<string, unknown[]> = {}
    for (const name of DUMP_ORDER) {
      if (!present.has(name)) continue
      tables[name] = await probe.table(name).toArray()
    }
    if (Array.isArray(tables.settings)) {
      tables.settings = (tables.settings as { key: string }[]).filter((r) => r.key !== GITHUB_TOKEN_KEY)
    }
    const payload = {
      app: 'LifeOS',
      schemaVersion: 1,
      formulaVersion: 1,
      exportedAt: new Date().toISOString(),
      checksum: await checksumOf(tables),
      tables,
    }
    return JSON.stringify(payload, null, 2)
  } finally {
    probe.close()
  }
}
