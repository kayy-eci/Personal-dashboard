import { getDb } from '../core/db/db'

export interface StorageStatus {
  persisted: boolean | null
  lastBackupAt: string | null
  usageMb: number | null
  quotaMb: number | null
}

export async function getDbStatus(): Promise<StorageStatus> {
  const settings = await getDb().settings.toArray()
  const lastBackupAt = (settings.find((s) => s.key === 'backup.lastBackupAt')?.value as string | undefined) ?? null
  let persisted: boolean | null = null
  try {
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      persisted = await navigator.storage.persisted()
    }
  } catch {
    persisted = null
  }
  let usageMb: number | null = null
  let quotaMb: number | null = null
  try {
    const est = await navigator.storage.estimate()
    if (est.usage) usageMb = est.usage / 1e6
    if (est.quota) quotaMb = est.quota / 1e6
  } catch {
    // ignore
  }
  return { persisted, lastBackupAt, usageMb, quotaMb }
}
