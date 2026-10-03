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
  /** Stable identifier used by the application hash route. */
  id: PageId
  label: string
  icon: ComponentType<IconProps>
}

export type PageId =
  | 'dashboard'
  | 'habits'
  | 'quests'
  | 'goals'
  | 'attributes'
  | 'timeline'
  | 'analytics'
  | 'settings'

/** Primary LifeOS destinations, ordered by the product's daily workflow. */
export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'habits', label: 'Habits', icon: HabitsIcon },
  { id: 'quests', label: 'Quests', icon: QuestsIcon },
  { id: 'goals', label: 'Goals', icon: GoalsIcon },
  { id: 'attributes', label: 'Character', icon: AttributesIcon },
  { id: 'timeline', label: 'Timeline', icon: TimelineIcon },
  { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon },
  { id: 'settings', label: 'Settings', icon: AttributesIcon },
]
