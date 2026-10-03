import { usePlayerProfile } from '../../features/player/usePlayerProfile'
import { usePreferences } from '../../preferences/usePreferences'
import { ChevronDownIcon, CloseIcon } from '../icons/Icons'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { navGroups, type NavGroup, type NavItem } from './nav-items'

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
 *
 * Groups collapse inline (persisted per group id). A group holding the active
 * page always stays open, so the current page can never be hidden behind a
 * collapsed group.
 */
export function Sidebar({ activePageId, isOpen, onSelect, onClose }: SidebarProps) {
  const { profileWithAvatar } = usePlayerProfile()
  const { preferences, toggleSidebarGroup } = usePreferences()
  const initial = profileWithAvatar.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <aside
      id="app-sidebar"
      className={`sticky top-0 flex h-dvh w-[14rem] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-bg p-2.5 text-sidebar-text max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-md max-md:transition-transform max-md:duration-200 max-md:ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`}
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

      <button
        type="button"
        className="relative mb-2.5 flex w-full items-center rounded-md bg-sidebar-field-bg px-[var(--pad-x)] py-[var(--pad-y)] text-left text-[0.8125rem] text-sidebar-text-muted transition-colors hover:bg-sidebar-surface-hover"
        onClick={() => window.dispatchEvent(new Event('lifeos:open-search'))}
        aria-label="Search — press to search everything"
      >
        <span>Search</span>
        <kbd className="pointer-events-none absolute right-2 rounded-sm bg-sidebar-bg-elevated px-1 text-[0.6875rem] leading-[1.4] text-sidebar-text-muted" aria-hidden="true">
          Ctrl K
        </kbd>
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Main">
        {navGroups.map((group) => (
          <NavSection
            key={group.id}
            group={group}
            activePageId={activePageId}
            collapsed={preferences.sidebarCollapsedGroups.includes(group.id)}
            onToggle={() => toggleSidebarGroup(group.id)}
            onSelect={onSelect}
          />
        ))}
      </nav>

      <div className="mt-1.5 flex flex-col gap-1.5 border-t border-sidebar-border pt-1.5">
        <ThemeToggle inSidebar />
        <div className="flex items-center gap-2 rounded-md p-2 text-[0.8125rem] text-sidebar-text">
          {profileWithAvatar.avatarSrc ? (
            <img
              className="h-6 w-6 shrink-0 rounded-sm object-cover"
              src={profileWithAvatar.avatarSrc}
              alt=""
            />
          ) : (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-sidebar-bg-elevated text-[0.6875rem] font-semibold text-sidebar-text-strong" aria-hidden="true">
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

interface NavSectionProps {
  group: NavGroup
  activePageId: string
  collapsed: boolean
  onToggle: () => void
  onSelect: () => void
}

function NavSection({ group, activePageId, collapsed, onToggle, onSelect }: NavSectionProps) {
  const holdsActivePage = group.items.some((item) => item.id === activePageId)
  const expanded = !collapsed || holdsActivePage
  const listId = `sidebar-group-${group.id}`

  return (
    <div className="group/nav">
      <h2>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={onToggle}
          className="flex min-h-[var(--row-h)] w-full items-center gap-1 rounded-md px-[var(--pad-x)] py-[var(--pad-y)] text-left font-mono text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-sidebar-text-muted transition-colors hover:bg-sidebar-surface-hover hover:text-sidebar-text"
        >
          <span className="flex-1 truncate">{group.label}</span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover/nav:opacity-100 group-focus-within/nav:opacity-100 ${expanded ? '' : '-rotate-90'}`}
          />
          <span className="sr-only">
            {expanded ? `Collapse ${group.label.toLowerCase()} group` : `Expand ${group.label.toLowerCase()} group`}
          </span>
        </button>
      </h2>

      {/* grid-template-rows 1fr → 0fr animates to the content height. */}
      <div
        className="grid transition-[grid-template-rows] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <ul id={listId} className="flex min-h-0 flex-col gap-0.5 overflow-hidden" role="list">
          {group.items.map((item) => (
            <li key={item.id}>
              <NavLink item={item} active={activePageId === item.id} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function NavLink({ item, active, onSelect }: { item: NavItem; active: boolean; onSelect: () => void }) {
  const Icon = item.icon
  return (
    <a
      href={`#/${item.id}`}
      className={`flex min-h-[var(--row-h)] w-full items-center gap-2 rounded-md px-[var(--pad-x)] py-[var(--pad-y)] text-[0.8125rem] text-sidebar-text no-underline transition-colors ${active ? 'bg-sidebar-surface-active font-medium text-sidebar-text-strong' : 'hover:bg-sidebar-surface-hover hover:text-sidebar-text-strong'}`}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      <Icon className={`h-[1.125rem] w-[1.125rem] shrink-0 ${active ? 'text-brand-text' : 'text-sidebar-text-muted'}`} />
      <span className="truncate">{item.label}</span>
    </a>
  )
}
