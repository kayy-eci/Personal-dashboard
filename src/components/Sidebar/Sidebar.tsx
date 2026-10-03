import { usePlayerProfile } from '../../features/player/usePlayerProfile'
import { ChevronDownIcon, CloseIcon } from '../icons/Icons'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { navItems } from './nav-items'

export interface SidebarProps {
  activePageId: string
  /** True while the sidebar is shown as an overlay drawer (small screens). */
  isOpen: boolean
  /** Called after activating a nav item — used to dismiss the mobile drawer. */
  onSelect: () => void
  /** Called by the drawer close button (small screens only). */
  onClose: () => void
}

/**
 * Light workspace sidebar with active states derived from the current route.
 */
export function Sidebar({ activePageId, isOpen, onSelect, onClose }: SidebarProps) {
  const { profileWithAvatar } = usePlayerProfile()
  const initial = profileWithAvatar.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <aside
      id="app-sidebar"
      className={`sticky top-0 flex h-dvh w-[15rem] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-bg p-3 text-sidebar-text max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-md max-md:transition-transform max-md:duration-200 max-md:ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`}
      aria-label="Workspace"
    >
      <div className="mb-1 flex min-h-8 items-center gap-1">
        <button type="button" className="flex flex-1 items-center gap-1 rounded-md p-1 text-left text-sidebar-text-strong cursor-default" disabled>
          <span className="truncate text-sm font-semibold tracking-[-0.01em]">LifeOS</span>
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-sidebar-text-muted" />
        </button>

        <button
          type="button"
          className="hidden h-7 w-7 items-center justify-center rounded-md text-sidebar-text-muted transition-colors hover:bg-sidebar-surface-hover hover:text-sidebar-text max-md:inline-flex"
          onClick={onClose}
        >
          <CloseIcon className="h-4 w-4" />
          <span className="sr-only">Close sidebar</span>
        </button>
      </div>

      <div className="relative mb-3 flex items-center">
        <input
          className="w-full rounded-md border border-transparent bg-sidebar-field-bg px-2 py-1 pr-12 text-[13px] text-sidebar-text placeholder:text-sidebar-text-muted disabled:cursor-not-allowed disabled:text-sidebar-text-muted"
          type="search"
          placeholder="Search"
          aria-label="Search — coming soon"
          title="Search is coming soon"
          disabled
        />
        <kbd className="pointer-events-none absolute right-2 rounded-sm bg-sidebar-bg-elevated px-1 text-[11px] leading-[1.4] text-sidebar-text-muted" aria-hidden="true">
          Ctrl K
        </kbd>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Main">
        <ul className="flex flex-col gap-0.5" role="list">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activePageId === item.id
            return (
              <li key={item.id}>
                <a
                  href={`#/${item.id}`}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-[0.4375rem] text-sm text-sidebar-text no-underline transition-colors ${active ? 'bg-sidebar-surface-active font-medium text-sidebar-text-strong' : 'hover:bg-sidebar-surface-hover hover:text-sidebar-text-strong'}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={onSelect}
                >
                  <Icon className={`h-[1.125rem] w-[1.125rem] shrink-0 ${active ? 'text-brand' : 'text-sidebar-text-muted'}`} />
                  <span className="truncate">{item.label}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-2 flex flex-col gap-2 border-t border-sidebar-border pt-2">
        <ThemeToggle inSidebar />
        <div className="flex items-center gap-2 rounded-md p-2 text-[13px] text-sidebar-text">
          {profileWithAvatar.avatarSrc ? (
            <img
              className="h-6 w-6 shrink-0 rounded-sm object-cover"
              src={profileWithAvatar.avatarSrc}
              alt=""
            />
          ) : (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-sidebar-bg-elevated text-[11px] font-semibold text-sidebar-text-strong" aria-hidden="true">
              {initial}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{profileWithAvatar.name}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-sidebar-text-muted" />
        </div>
      </div>
    </aside>
  )
}
