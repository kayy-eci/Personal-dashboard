import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'lifeos-theme'
const FALLBACK_DURATION_MS = 480

export type ThemeSwitchOrigin =
  | { x: number; y: number }
  | MouseEvent
  | ReactMouseEvent<HTMLElement>

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // storage unavailable — fall back to light
  }
  return 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function normalizeOrigin(origin?: ThemeSwitchOrigin): { x: number; y: number } | undefined {
  if (!origin) return undefined
  if ('clientX' in origin && 'clientY' in origin) {
    const { clientX, clientY } = origin as { clientX: number; clientY: number }
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) return { x: clientX, y: clientY }
    return undefined
  }
  const point = origin as { x?: number; y?: number }
  if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
    return { x: point.x as number, y: point.y as number }
  }
  return undefined
}

type ViewTransition = { ready: Promise<void>; finished: Promise<void> }
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition
}

/**
 * Shared theme state so every `useTheme()` consumer (App, sidebar toggle,
 * settings pills) always reads the same value — fixes the stale-state bug
 * where two hook instances each owned their own copy and settings pills
 * highlighted the wrong theme.
 */
let currentTheme: Theme = getInitialTheme()
const themeListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  // Keep `data-theme` in sync from the very start (covers the anti-flicker
  // value already applied in index.html).
  applyTheme(currentTheme)
}

function getThemeSnapshot(): Theme {
  return currentTheme
}

function getThemeServerSnapshot(): Theme {
  return 'light'
}

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener)
  return () => {
    themeListeners.delete(listener)
  }
}

function setCurrentTheme(next: Theme) {
  if (next === currentTheme) return
  currentTheme = next
  for (const listener of themeListeners) listener()
}

/**
 * Smooth, high-quality theme switch. View-Transition circular reveal with a
 * `theme-animating` cross-fade fallback. Honors prefers-reduced-motion.
 */
function animatedApply(next: Theme, origin?: ThemeSwitchOrigin) {
  const root = document.documentElement
  const updateDom = () => {
    flushSync(() => {
      applyTheme(next)
      setCurrentTheme(next)
    })
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // non-fatal — theme still applies for the session
    }
  }

  if (prefersReducedMotion()) {
    updateDom()
    return
  }

  const doc = document as ViewTransitionDocument
  const point = normalizeOrigin(origin)

  // --- Fallback: app-wide color cross-fade ---------------------------------
  const runFallback = () => {
    root.classList.add('theme-animating')
    updateDom()
    window.setTimeout(() => root.classList.remove('theme-animating'), FALLBACK_DURATION_MS)
  }

  if (typeof doc.startViewTransition !== 'function') {
    runFallback()
    return
  }

  try {
    const transition = doc.startViewTransition(() => {
      updateDom()
    })

    // Circular reveal expanding from the toggle click (or top-right corner).
    const x = point?.x ?? window.innerWidth - 28
    const y = point?.y ?? 28
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 550,
            easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
            // `pseudoElement` for view-transition reveal — not yet in TS DOM libs.
            pseudoElement: '::view-transition-new(root)',
          } as KeyframeAnimationOptions & { pseudoElement: string },
        )
      })
      .catch(() => {
        // WAAPI rejected — the view transition itself still completes.
      })
  } catch {
    runFallback()
  }
}

/**
 * App-wide light/dark theme.
 * - Persists to localStorage (`lifeos-theme`)
 * - Defaults to stored value, falls back to light
 * - Syncs across tabs via `storage` event (instant, no animation)
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // non-fatal — theme still applies for the session
    }
  }, [theme])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      if (event.newValue === 'light' || event.newValue === 'dark') {
        applyTheme(event.newValue)
        setCurrentTheme(event.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((next: Theme, origin?: ThemeSwitchOrigin) => {
    if (next === currentTheme) return
    animatedApply(next, origin)
  }, [])

  const toggleTheme = useCallback((origin?: ThemeSwitchOrigin) => {
    const next: Theme = currentTheme === 'light' ? 'dark' : 'light'
    animatedApply(next, origin)
  }, [])

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' }
}
