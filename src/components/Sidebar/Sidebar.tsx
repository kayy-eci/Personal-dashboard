import { ChevronDownIcon, CloseIcon } from '../icons/Icons'
import { navItems } from './nav-items'
import './Sidebar.css'

export interface SidebarProps {
  /** True while the sidebar is shown as an overlay drawer (small screens). */
  isOpen: boolean
  /** Called after activating a nav item — used to dismiss the mobile drawer. */
  onSelect: () => void
  /** Called by the drawer close button (small screens only). */
  onClose: () => void
}

/**
 * Workspace sidebar, modelled on the reference design (design/image.png):
 * dark canvas, quiet type, generous spacing, hairline separators.
 *
 * MVP exposes a single destination — Dashboard. Everything else in the
 * reference (Recents, Favorites, Agents, Upcoming events) is intentionally
 * absent until those features exist.
 */
export function Sidebar({ isOpen, onSelect, onClose }: SidebarProps) {
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
                <button
                  type="button"
                  className={`sidebar__nav-item${
                    item.isActive ? ' sidebar__nav-item--active' : ''
                  }`}
                  aria-current={item.isActive ? 'page' : undefined}
                  onClick={onSelect}
                >
                  <Icon className="sidebar__nav-icon" />
                  <span className="sidebar__nav-label">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__account">
          <span className="sidebar__avatar" aria-hidden="true">
            P
          </span>
          <span className="sidebar__account-name">Player</span>
          <ChevronDownIcon className="sidebar__account-chevron" />
        </div>
      </div>
    </aside>
  )
}
