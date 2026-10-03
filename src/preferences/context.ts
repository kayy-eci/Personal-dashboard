import { createContext } from 'react'
import type { DashboardSectionId, PreferenceKey, Preferences, SidebarGroupId } from './schema'

export interface PreferencesContextValue {
  preferences: Preferences
  /** False until the data layer has been read once; cached values are already applied. */
  ready: boolean
  setPreference: <K extends PreferenceKey>(key: K, value: Preferences[K]) => void
  resetDisplayPreferences: () => void
  hideSection: (id: DashboardSectionId) => void
  restoreSection: (id: DashboardSectionId) => void
  toggleSidebarGroup: (id: SidebarGroupId) => void
  announce: (message: string) => void
  /** Set when a write to the store failed; the change stays applied in the session. */
  saveError: boolean
  retrySave: () => void
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null)
