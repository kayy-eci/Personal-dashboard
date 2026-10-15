import type { ComponentType } from 'react'
import {
  AnalyticsIcon,
  CheckSquareIcon,
  DashboardIcon,
  GoalsIcon,
  HabitsIcon,
  MessageSquareIcon,
  TimelineIcon,
  UserRoundIcon,
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
  | 'chat'
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

/** Top-level items (no group label). */
export const topLevelItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
]

/** Chat item (separate from main navigation). */
export const chatItem: NavItem = { id: 'chat', label: 'Chat', icon: MessageSquareIcon }

/** Grouped navigation items. */
export const navGroups: NavGroup[] = [
  {
    id: 'daily',
    label: 'Daily',
    items: [
      { id: 'habits', label: 'Habits', icon: HabitsIcon },
      { id: 'quests', label: 'Tasks', icon: CheckSquareIcon },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    items: [
      { id: 'goals', label: 'Goals', icon: GoalsIcon },
      { id: 'attributes', label: 'Character', icon: UserRoundIcon },
      { id: 'timeline', label: 'Timeline', icon: TimelineIcon },
      { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon },
    ],
  },
]

/** Flat list in navigation order. */
export const navItems: NavItem[] = [
  chatItem,
  ...topLevelItems,
  ...navGroups.flatMap((group) => group.items),
  { id: 'settings', label: 'Settings', icon: UserRoundIcon }, // accessed via footer
]
