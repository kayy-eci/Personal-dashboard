import type { ComponentType } from 'react'
import { DashboardIcon, type IconProps } from '../icons/Icons'

export interface NavItem {
  /** Stable identifier — becomes the route key once routing is introduced. */
  id: string
  label: string
  icon: ComponentType<IconProps>
  isActive?: boolean
}

/**
 * Primary navigation, mirroring the reference sidebar.
 *
 * MVP ships a single destination: Dashboard. Add further entries here
 * (Habits, Quests, Goals, Timeline, Analytics) as those pages land — the
 * sidebar renders whatever this list contains.
 */
export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, isActive: true },
]
