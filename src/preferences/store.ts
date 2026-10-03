import { readStoredValue, removeStoredValue, writeStoredValue } from '../lib/storage'
import {
  coercePreference,
  coercePreferences,
  DEFAULT_PREFERENCES,
  PREFERENCE_STORAGE_KEYS,
  type PreferenceKey,
  type Preferences,
  type ResetScope,
} from './schema'

/**
 * Mock data layer for user preferences.
 *
 * Same shape the real backend will have: async calls that today resolve from
 * an in-memory cache backed by `localStorage`, and that later become Tauri
 * `invoke()` calls against a `settings` key/value table. Every read validates,
 * so a corrupt or partial store degrades to defaults instead of throwing.
 */

let cache: Preferences | null = null
let writeCount = 0

function loadFromStorage(): Preferences {
  if (cache) return cache
  const stored: Record<string, unknown> = {}
  for (const [key, storageKey] of Object.entries(PREFERENCE_STORAGE_KEYS)) {
    stored[key] = readStoredValue<unknown>(storageKey, undefined)
  }
  cache = coercePreferences(stored)
  return cache
}

function persist<K extends PreferenceKey>(key: K, value: Preferences[K]): void {
  if (!writeStoredValue(PREFERENCE_STORAGE_KEYS[key], value)) {
    throw new Error(`Could not persist preference "${key}".`)
  }
}

/** Synchronous read of the cached values, used to paint before React mounts. */
export function readCachedPreferences(): Preferences {
  return loadFromStorage()
}

/** Reads every preference, validating anything already in storage. */
export async function getPreferences(): Promise<Preferences> {
  return { ...loadFromStorage() }
}

/** Persists one preference. Rejects if the write fails so callers can surface it. */
export async function setPreference<K extends PreferenceKey>(
  key: K,
  value: Preferences[K],
): Promise<Preferences> {
  const next = { ...loadFromStorage(), [key]: coercePreference(key, value) }
  persist(key, next[key])
  cache = next
  writeCount += 1
  return { ...next }
}

/**
 * Restores a scope to its defaults. `display` covers the appearance settings
 * only — sidebar groups, hidden sections and focus mode are deliberately left
 * alone, so "Reset display settings" cannot quietly rearrange the dashboard.
 */
export async function resetPreferences(scope: ResetScope): Promise<Preferences> {
  const displayKeys: PreferenceKey[] = [
    'theme',
    'accent',
    'density',
    'textSize',
    'reduceMotion',
  ]
  const current = loadFromStorage()

  if (scope === 'all') {
    for (const key of Object.keys(PREFERENCE_STORAGE_KEYS) as PreferenceKey[]) {
      removeStoredValue(PREFERENCE_STORAGE_KEYS[key])
    }
    cache = { ...DEFAULT_PREFERENCES }
    writeCount += 1
    return { ...cache }
  }

  const next: Preferences = { ...current }
  for (const key of displayKeys) {
    removeStoredValue(PREFERENCE_STORAGE_KEYS[key])
    Object.assign(next, { [key]: DEFAULT_PREFERENCES[key] })
  }
  cache = { ...next }
  writeCount += 1
  return { ...cache }
}

/** Test seam: how many writes this session has performed. */
export function preferenceWriteCount(): number {
  return writeCount
}
