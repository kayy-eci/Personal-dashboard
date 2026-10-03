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
import type { SidebarGroupId } from '../../preferences/schema'

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

export interface NavGroup {
  id: SidebarGroupId
  label: string
  items: NavItem[]
}

/** Primary LifeOS destinations, grouped by when they are used. */
export const navGroups: NavGroup[] = [
  {
    id: 'daily',
    label: 'DAILY',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
      { id: 'habits', label: 'Habits', icon: HabitsIcon },
      { id: 'quests', label: 'Quests', icon: QuestsIcon },
    ],
  },
  {
    id: 'growth',
    label: 'GROWTH',
    items: [
      { id: 'goals', label: 'Goals', icon: GoalsIcon },
      { id: 'attributes', label: 'Character', icon: AttributesIcon },
      { id: 'timeline', label: 'Timeline', icon: TimelineIcon },
      { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    items: [{ id: 'settings', label: 'Settings', icon: AttributesIcon }],
  },
]

/** Flat list in navigation order — used by routing and search. */
export const navItems: NavItem[] = navGroups.flatMap((group) => group.items)
