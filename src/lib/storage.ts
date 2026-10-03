import { useCallback, useState } from 'react'

/**
 * Safe, versioned localStorage persistence. Every write is wrapped in
 * try/catch so private-browsing or quota failures degrade to in-memory state
 * instead of crashing the app. Values are JSON; corrupt payloads fall back to
 * the provided default.
 */

const KEY_PREFIX = 'lifeos:'

function fullKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`
}

export function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(fullKey(key))
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStoredValue<T>(key: string, value: T): boolean {
  try {
    window.localStorage.setItem(fullKey(key), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStoredValue(key: string): void {
  try {
    window.localStorage.removeItem(fullKey(key))
  } catch {
    // Non-fatal.
  }
}

/** Removes every key written through this module. */
export function clearAllStoredValues(): void {
  try {
    const doomed: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && (k.startsWith(KEY_PREFIX) || k === 'lifeos-theme')) doomed.push(k)
    }
    doomed.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // Non-fatal.
  }
}

/**
 * useState mirrored to localStorage. The initial render reads the stored
 * value (or the provided default); every setter writes through. `reset()`
 * restores the default and clears the key.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T | (() => T),
): [T, (next: T | ((current: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue
    return readStoredValue<T>(key, fallback)
  })

  const setAndPersist = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? (next as (c: T) => T)(current) : next
        writeStoredValue(key, resolved)
        return resolved
      })
    },
    [key],
  )

  const reset = useCallback(() => {
    const fallback = typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue
    removeStoredValue(key)
    setValue(fallback)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return [value, setAndPersist, reset]
}
