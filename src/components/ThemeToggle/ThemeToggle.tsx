import { resolveTheme } from '../../preferences/apply'
import { usePreferences } from '../../preferences/usePreferences'
import { animateAppearanceChange } from '../../preferences/themeSwitch'

/**
 * Compact light/dark switch used in the sidebar footer and mobile topbar.
 * Full label for AT, icon + short label visually.
 *
 * The switch writes the `appearance.theme` preference (Light ⇄ Dark); System
 * is chosen in Settings → Display. The click point becomes the reveal origin.
 */
export function ThemeToggle({
  compact = false,
  inSidebar = false,
}: {
  compact?: boolean
  inSidebar?: boolean
}) {
  const { preferences, setPreference } = usePreferences()
  const isDark = resolveTheme(preferences.theme) === 'dark'

  const base =
    'inline-flex items-center gap-2 min-h-8 px-2 text-xs font-semibold border rounded-md bg-transparent cursor-pointer transition-colors duration-120'
  const colors = inSidebar
    ? 'border-sidebar-border text-sidebar-text-muted hover:bg-sidebar-surface-hover hover:text-sidebar-text-strong'
    : 'border-border text-text-muted hover:bg-surface-sunken hover:text-text hover:border-border-strong'
  const compactCls = compact ? 'w-8 h-8 justify-center p-0 border-transparent' : 'w-full justify-start'

  const switchTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    animateAppearanceChange(
      () => setPreference('theme', isDark ? 'light' : 'dark'),
      event,
      preferences.reduceMotion,
    )
  }

  return (
    <button
      type="button"
      className={`${base} ${colors} ${compactCls}`}
      onClick={switchTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="inline-flex shrink-0 overflow-hidden" aria-hidden="true">
        <span key={isDark ? 'sun' : 'moon'} className="inline-flex animate-[theme-toggle-icon-in_320ms_cubic-bezier(0.32,0.72,0,1)]">
          {isDark ? (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="10" cy="10" r="3.5" />
              <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M15.3 4.7 14 6M6 14l-1.3 1.3" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M16.5 13.5A7 7 0 0 1 6.5 3.5a7 7 0 1 0 10 10Z" />
            </svg>
          )}
        </span>
      </span>
      {!compact && <span className="flex-1 text-left">{isDark ? 'Dark' : 'Light'}</span>}
      {!compact && (
        <span className="inline-flex items-center w-7 h-4 p-0.5 rounded-pill bg-sidebar-bg-elevated" aria-hidden="true">
          <span
            className={`w-3 h-3 rounded-full bg-sidebar-text-muted transition-transform duration-300 ${isDark ? 'translate-x-3 !bg-brand' : ''}`}
          />
        </span>
      )}
    </button>
  )
}
