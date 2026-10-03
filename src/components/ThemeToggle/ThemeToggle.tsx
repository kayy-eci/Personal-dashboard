import { useTheme } from '../../hooks/useTheme'
import './ThemeToggle.css'

/**
 * Compact light/dark switch used in the sidebar footer and mobile topbar.
 * Full label for AT, icon + short label visually.
 *
 * Passes the click point as the transition origin so the theme reveal
 * expands outward from where the user clicked (View Transitions API).
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? ' theme-toggle--compact' : ''}`}
      onClick={(event) => toggleTheme(event)}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        <span key={isDark ? 'sun' : 'moon'} className="theme-toggle__icon-swap">
          {isDark ? (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="3.5" />
              <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M15.3 4.7 14 6M6 14l-1.3 1.3" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 13.5A7 7 0 0 1 6.5 3.5a7 7 0 1 0 10 10Z" />
            </svg>
          )}
        </span>
      </span>
      {!compact && <span className="theme-toggle__label">{isDark ? 'Dark' : 'Light'}</span>}
      {!compact && (
        <span className="theme-toggle__track" aria-hidden="true">
          <span className="theme-toggle__thumb" data-theme-state={theme} />
        </span>
      )}
    </button>
  )
}
