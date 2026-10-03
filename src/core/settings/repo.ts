import { getDb } from '../db/db'
import { DataError } from '../db/errors'
import { getDefault, isKnownKey, validateSetting } from './schema'

export async function getSetting<T>(key: string): Promise<T> {
  const row = await getDb().settings.get(key)
  if (row === undefined) return getDefault(key) as T
  if (!validateSetting(key, row.value)) return getDefault(key) as T
  return row.value as T
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  if (!isKnownKey(key)) throw new DataError('VALIDATION', `Unknown settings key: ${key}`)
  if (!validateSetting(key, value)) throw new DataError('VALIDATION', `Invalid value for ${key}`)
  await getDb().settings.put({ key, value, updatedAt: new Date().toISOString() })
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await getDb().settings.toArray()
  const out: Record<string, unknown> = {}
  const { DEFAULTS } = await import('./schema')
  for (const k of Object.keys(DEFAULTS)) out[k] = getDefault(k)
  for (const r of rows) if (validateSetting(r.key, r.value)) out[r.key] = r.value
  return out
}
