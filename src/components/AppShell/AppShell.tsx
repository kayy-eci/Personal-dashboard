import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PageHeader } from '../PageHeader/PageHeader'
import { Sidebar } from '../Sidebar/Sidebar'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { MenuIcon } from '../icons/Icons'

export interface AppShellProps {
  activePageId: string
  /**
   * Identity of the page being rendered. The shell owns the header so every
   * page is guaranteed a cover image / GIF slot — a page cannot ship without
   * one. `pageId` keys that page's stored cover.
   */
  page: {
    pageId: string
    title: string
    subtitle?: string
  }
  /** Page body, rendered below the header. */
  children: ReactNode
}

/**
 * Three-region application frame: workspace sidebar, page header (cover +
 * title), and the scrolling content canvas.
 *
 * Above 768px the sidebar is a static column. At 768px and below it becomes
 * an off-canvas drawer with a scrim, driven by the top bar toggle.
 */
export function AppShell({ page, activePageId, children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

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

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [activePageId])

  return (
    <div className={`relative flex min-h-dvh flex-1 flex-col bg-page-bg min-[769px]:flex-row`}>
      <a
        className="absolute left-2 top-2 z-[60] rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text no-underline shadow-sm -translate-y-[200%] transition-transform focus-visible:translate-y-0"
        href="#main-content"
      >
        Skip to main content
      </a>

      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 min-[769px]:hidden">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
          onClick={() => setIsSidebarOpen((open) => !open)}
          aria-expanded={isSidebarOpen}
          aria-controls="app-sidebar"
        >
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </button>
        <span className="text-sm font-semibold text-text">{page.title}</span>
        <span className="flex-1" />
        <ThemeToggle compact />
      </div>

      <Sidebar
        activePageId={activePageId}
        isOpen={isSidebarOpen}
        onSelect={closeSidebar}
        onClose={closeSidebar}
      />

      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-scrim" onClick={closeSidebar} aria-hidden="true" />
      )}

      <main ref={mainRef} id="main-content" className="flex min-w-0 flex-1 flex-col overflow-y-auto focus:outline-none" tabIndex={-1}>
        {/* Keyed by page so navigation replays the enter motion; the
            key is stable across theme switches, so the theme reveal
            never re-triggers it. */}
        <div
          key={activePageId}
          className="flex min-h-0 flex-1 flex-col animate-[page-enter_260ms_cubic-bezier(0.32,0.72,0,1)_both]"
        >
          <PageHeader
            pageId={page.pageId}
            title={page.title}
            subtitle={page.subtitle}
          />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </main>
    </div>
  )
}
