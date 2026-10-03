import type { Preferences, ReduceMotion, ResolvedTheme, ThemePreference } from './schema'

/**
 * Writes preferences onto the document root as data attributes. Components
 * never read a preference value in JS — the only exception is code that needs
 * the resolved system theme (canvas colour) or week maths.
 *
 * Mirrored by the inline bootstrap in `index.html`, which has to run before
 * the bundle loads; keep the two in sync.
 */

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function resolveTheme(theme: ThemePreference): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return theme
}

export function resolveReducedMotion(preference: ReduceMotion): boolean {
  if (preference === 'system') return systemPrefersReducedMotion()
  return preference === 'on'
}

/** True when animations should be suppressed, from media query or preference. */
export function motionSuppressed(preference: ReduceMotion): boolean {
  return resolveReducedMotion(preference) || systemPrefersReducedMotion()
}

export function applyPreferences(preferences: Preferences): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const theme = resolveTheme(preferences.theme)

  root.dataset.theme = theme
  root.dataset.accent = preferences.accent
  root.dataset.density = preferences.density
  root.dataset.textSize = preferences.textSize
  root.dataset.motion = resolveReducedMotion(preferences.reduceMotion) ? 'reduce' : 'full'
  root.dataset.focusMode = preferences.focusMode ? 'true' : 'false'
  // Keeps native controls, scrollbars and form widgets on the chosen scheme.
  root.style.colorScheme = theme
}

/** Animation duration helper for JS-driven transitions (collapsing groups). */
export function transitionDurationMs(preference: ReduceMotion): number {
  return motionSuppressed(preference) ? 0 : 150
}
