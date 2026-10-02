import type { ComponentType } from 'react'
import {
  AnalyticsIcon,
  AttributesIcon,
  DashboardIcon,
  GoalsIcon,
  HabitsIcon,
  QuestsIcon,
  TimelineIcon,
  type IconProps,
} from '../icons/Icons'

export interface NavItem {
  /** Stable identifier — becomes the route key once routing is introduced. */
  id: string
  label: string
  icon: ComponentType<IconProps>
  /** The destination currently being viewed. */
  isActive?: boolean
}

/**
 * Primary navigation, mirroring the reference sidebar (design/image.png).
 *
 * Order matches the product map in the PRD: Dashboard (§3.2), Habit
 * Management (§3.3), Quest Management (§3.4), Goals & Milestones (§3.5),
 * Attributes (§3.6), Timeline (§3.9) and Analytics (§3.11).
 *
 * Only Dashboard is marked active because it is the only page that exists so
 * far — each entry here becomes a route as its page lands.
 */
export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, isActive: true },
  { id: 'habits', label: 'Habits & Routines', icon: HabitsIcon },
  { id: 'quests', label: 'Quests & Objectives', icon: QuestsIcon },
  { id: 'goals', label: 'Goals & Milestones', icon: GoalsIcon },
  { id: 'attributes', label: 'Attributes & Stats', icon: AttributesIcon },
  { id: 'timeline', label: 'Timeline & Logs', icon: TimelineIcon },
  { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon },
]
