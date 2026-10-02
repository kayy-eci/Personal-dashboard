import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Sidebar } from '../Sidebar/Sidebar'
import { MenuIcon } from '../icons/Icons'
import './AppShell.css'

export interface AppShellProps {
  /** Page rendered inside the content region. */
  children: ReactNode
}

/**
 * Two-region application frame: workspace sidebar + content canvas.
 *
 * Above 768px the sidebar is a static column. At 768px and below it becomes
 * an off-canvas drawer with a scrim, driven by the top bar toggle.
 */
export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), [])

  // Escape closes the drawer; body scroll is locked while it is open.
  useEffect(() => {
    if (!isSidebarOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSidebar()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isSidebarOpen, closeSidebar])

  // Growing past the mobile breakpoint reveals the static rail — drop the
  // drawer state so the scrim and scroll lock cannot get stranded.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 769px)')
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) closeSidebar()
    }

    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [closeSidebar])

  return (
    <div className={`app-shell${isSidebarOpen ? ' app-shell--drawer-open' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <div className="app-shell__topbar">
        <button
          type="button"
          className="app-shell__menu-button"
          onClick={() => setIsSidebarOpen((open) => !open)}
          aria-expanded={isSidebarOpen}
          aria-controls="app-sidebar"
        >
          <MenuIcon className="app-shell__menu-icon" />
          <span className="sr-only">Toggle sidebar</span>
        </button>
        <span className="app-shell__topbar-title">LifeOS</span>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onSelect={closeSidebar}
        onClose={closeSidebar}
      />

      {isSidebarOpen && (
        <div className="app-shell__scrim" onClick={closeSidebar} aria-hidden="true" />
      )}

      <main id="main-content" className="app-shell__main" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
