import { usePlayerProfile } from '../../features/player/usePlayerProfile'
import { ChevronDownIcon, CloseIcon } from '../icons/Icons'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { navItems } from './nav-items'
import './Sidebar.css'

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
      className={`sidebar${isOpen ? ' sidebar--open' : ''}`}
      aria-label="Workspace"
    >
      <div className="sidebar__header">
        <button type="button" className="sidebar__workspace" disabled>
          <span className="sidebar__workspace-name">LifeOS</span>
          <ChevronDownIcon className="sidebar__workspace-chevron" />
        </button>

        <button
          type="button"
          className="sidebar__icon-button sidebar__close"
          onClick={onClose}
        >
          <CloseIcon className="sidebar__icon" />
          <span className="sr-only">Close sidebar</span>
        </button>
      </div>

      <div className="sidebar__search">
        <input
          className="sidebar__search-field"
          type="search"
          placeholder="Search"
          aria-label="Search — coming soon"
          title="Search is coming soon"
          disabled
        />
        <kbd className="sidebar__kbd" aria-hidden="true">
          Ctrl K
        </kbd>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        <ul className="sidebar__nav-list" role="list">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <a
                  href={`#/${item.id}`}
                  className={`sidebar__nav-item${
                    activePageId === item.id ? ' sidebar__nav-item--active' : ''
                  }`}
                  aria-current={activePageId === item.id ? 'page' : undefined}
                  onClick={onSelect}
                >
                  <Icon className="sidebar__nav-icon" />
                  <span className="sidebar__nav-label">{item.label}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <ThemeToggle />
        <div className="sidebar__account">
          {profileWithAvatar.avatarSrc ? (
            <img
              className="sidebar__avatar-image"
              src={profileWithAvatar.avatarSrc}
              alt=""
            />
          ) : (
            <span className="sidebar__avatar" aria-hidden="true">
              {initial}
            </span>
          )}
          <span className="sidebar__account-name">{profileWithAvatar.name}</span>
          <ChevronDownIcon className="sidebar__account-chevron" />
        </div>
      </div>
    </aside>
  )
}
