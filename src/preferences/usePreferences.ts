import { useContext } from 'react'
import { PreferencesContext, type PreferencesContextValue } from './context'

/** Reads the current preferences and the setters that change them. */
export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext)
  if (!context) {
    throw new Error('usePreferences must be used inside <PreferencesProvider>.')
  }
  return context
}
