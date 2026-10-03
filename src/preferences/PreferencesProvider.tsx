import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { applyPreferences } from './apply'
import { PreferencesContext, type PreferencesContextValue } from './context'
import {
  ALWAYS_VISIBLE_SECTIONS,
  DEFAULT_PREFERENCES,
  type DashboardSectionId,
  type PreferenceKey,
  type Preferences,
  type SidebarGroupId,
} from './schema'
import { sectionLabel } from './sections'
import { getPreferences, readCachedPreferences, resetPreferences, setPreference } from './store'

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Seeded from the cache so the first paint already matches the stored
  // preferences; the async read below only reconciles.
  const [preferences, setPreferences] = useState<Preferences>(readCachedPreferences)
  const [ready, setReady] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [saveError, setSaveError] = useState(false)
  const failedWrite = useRef<{ key: PreferenceKey; value: unknown } | null>(null)

  useEffect(() => {
    applyPreferences(preferences)
  }, [preferences])

  useEffect(() => {
    let active = true
    getPreferences()
      .then((stored) => {
        if (active) setPreferences(stored)
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  // System-driven preferences follow the OS while they are set to "System".
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    // Only the "System" options read the OS, so only those need a listener.
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => applyPreferences(preferences)

    colorScheme.addEventListener('change', sync)
    reducedMotion.addEventListener('change', sync)
    return () => {
      colorScheme.removeEventListener('change', sync)
      reducedMotion.removeEventListener('change', sync)
    }
  }, [preferences])

  const commit = useCallback(
    <K extends PreferenceKey>(key: K, value: Preferences[K]) => {
      setPreferences((current) => ({ ...current, [key]: value }))
      void setPreference(key, value)
        .then((stored) => {
          setPreferences(stored)
          setSaveError(false)
          failedWrite.current = null
        })
        .catch(() => {
          // The change stays applied for this session; Settings shows a retry.
          failedWrite.current = { key, value }
          setSaveError(true)
        })
    },
    [],
  )

  const setPreferenceValue = useCallback(
    <K extends PreferenceKey>(key: K, value: Preferences[K]) => commit(key, value),
    [commit],
  )

  const resetDisplayPreferences = useCallback(() => {
    setPreferences((current) => ({ ...current, ...pickDisplayDefaults(current) }))
    void resetPreferences('display')
      .then((stored) => {
        setPreferences(stored)
        setSaveError(false)
      })
      .catch(() => setSaveError(true))
  }, [])

  const announce = useCallback((message: string) => {
    // Re-announce identical messages by clearing first.
    setAnnouncement('')
    window.setTimeout(() => setAnnouncement(message), 30)
  }, [])

  const hideSection = useCallback(
    (id: DashboardSectionId) => {
      if (ALWAYS_VISIBLE_SECTIONS.includes(id)) return
      const next = preferences.hiddenSections.includes(id)
        ? preferences.hiddenSections
        : [...preferences.hiddenSections, id]
      setPreferences((current) => ({ ...current, hiddenSections: next }))
      announce(`${sectionLabel(id)} hidden. Undo available.`)
      void setPreference('hiddenSections', next).catch(() => setSaveError(true))
    },
    [announce, preferences.hiddenSections],
  )

  const restoreSection = useCallback(
    (id: DashboardSectionId) => {
      const next = preferences.hiddenSections.filter((sectionId) => sectionId !== id)
      setPreferences((current) => ({ ...current, hiddenSections: next }))
      announce(`${sectionLabel(id)} restored.`)
      void setPreference('hiddenSections', next)
        .then((stored) => setPreferences(stored))
        .catch(() => setSaveError(true))
    },
    [announce, preferences.hiddenSections],
  )

  const toggleSidebarGroup = useCallback(
    (id: SidebarGroupId) => {
      const next = preferences.sidebarCollapsedGroups.includes(id)
        ? preferences.sidebarCollapsedGroups.filter((groupId) => groupId !== id)
        : [...preferences.sidebarCollapsedGroups, id]
      setPreferences((current) => ({ ...current, sidebarCollapsedGroups: next }))
      void setPreference('sidebarCollapsedGroups', next)
        .then((stored) => setPreferences(stored))
        .catch(() => setSaveError(true))
    },
    [preferences.sidebarCollapsedGroups],
  )

  const retrySave = useCallback(() => {
    const failed = failedWrite.current
    if (!failed) {
      setSaveError(false)
      return
    }
    commit(failed.key, failed.value as Preferences[typeof failed.key])
  }, [commit])

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      ready,
      setPreference: setPreferenceValue,
      resetDisplayPreferences,
      hideSection,
      restoreSection,
      toggleSidebarGroup,
      announce,
      saveError,
      retrySave,
    }),
    [
      preferences,
      ready,
      setPreferenceValue,
      resetDisplayPreferences,
      hideSection,
      restoreSection,
      toggleSidebarGroup,
      announce,
      saveError,
      retrySave,
    ],
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </PreferencesContext.Provider>
  )
}

function pickDisplayDefaults(current: Preferences): Preferences {
  return {
    ...current,
    theme: DEFAULT_PREFERENCES.theme,
    accent: DEFAULT_PREFERENCES.accent,
    density: DEFAULT_PREFERENCES.density,
    textSize: DEFAULT_PREFERENCES.textSize,
    reduceMotion: DEFAULT_PREFERENCES.reduceMotion,
  }
}

