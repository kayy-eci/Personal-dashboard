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

/** Primary LifeOS destinations, ordered by the product's daily workflow. */
export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'habits', label: 'Habits & Routines', icon: HabitsIcon },
  { id: 'quests', label: 'Quests & Objectives', icon: QuestsIcon },
  { id: 'goals', label: 'Goals & Milestones', icon: GoalsIcon },
  { id: 'attributes', label: 'Attributes & Stats', icon: AttributesIcon },
  { id: 'timeline', label: 'Timeline & Logs', icon: TimelineIcon },
  { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon },
]
