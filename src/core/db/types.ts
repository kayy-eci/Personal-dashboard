import type { Attribute } from '../domain/xp'
import type { XpBreakdown } from '../domain/xp'

export type { Attribute, XpBreakdown }
export type EventType =
  | 'profile_created'
  | 'habit_checkin'
  | 'quest_completed'
  | 'milestone_completed'
  | 'goal_completed'
  | 'level_up'
  | 'attribute_level_up'
  | 'achievement_unlocked'
  | 'vitality_loss'
  | 'vitality_gain'

export interface Profile {
  id: 1
  name: string
  avatar?: string
  level: number
  totalXp: number
  health: number
  maxHealth: number
  currentStreak: number
  bestStreak: number
  lastStreakDate?: string
  createdAt: string
  updatedAt: string
}

export interface AttributeStatRow {
  attribute: Attribute
  xp: number
  level: number
}

export interface Goal {
  id?: number
  title: string
  description: string
  category: string
  attribute?: Attribute
  status: 'active' | 'completed' | 'archived'
  deadline?: string
  createdAt: string
  completedAt?: string
}

export interface Milestone {
  id?: number
  goalId: number
  title: string
  orderIndex: number
  status: 'pending' | 'done'
  completedAt?: string
}

export type QuestType = 'main' | 'side' | 'challenge' | 'recovery'
export type QuestStatus = 'active' | 'completed' | 'archived'

export interface Quest {
  id?: number
  goalId?: number
  milestoneId?: number
  title: string
  description: string
  type: QuestType
  category: string
  difficulty: number
  effort: number
  impact: number
  baseXp?: number
  attributes: Attribute[]
  scheduledDate?: string
  deadline?: string
  status: QuestStatus
  createdAt: string
  createdLocalDate: string
  completedAt?: string
  completedLocalDate?: string
}

export interface Habit {
  id?: number
  goalId?: number
  name: string
  frequency: 'daily' | 'weekly'
  category: string
  difficulty: number
  impact: number
  attributes: Attribute[]
  archived: boolean
  createdAt: string
  createdLocalDate: string
}

export interface HabitLog {
  id?: number
  habitId: number
  logDate: string
  createdAt: string
}

export interface XpLedgerRow {
  id?: number
  sourceType: 'habit' | 'quest' | 'milestone' | 'goal' | 'reversal'
  sourceId: number
  attribute: Attribute | null
  xpAmount: number
  breakdown: XpBreakdown
  formulaVersion: number
  localDate: string
  createdAt: string
}

export interface HealthLog {
  id?: number
  logDate: string
  kind: 'missed_habit' | 'missed_quest' | 'recovery'
  changeAmount: number
  reason: string
  healthAfter: number
  lossKey?: string
  createdAt: string
}

export interface TimelineEvent {
  id?: number
  eventType: EventType
  refType?: string
  refId?: number
  title: string
  note: string
  xpDelta?: number
  healthDelta?: number
  localDate: string
  createdAt: string
}

export interface AchievementRow {
  ruleKey: string
  name: string
  description: string
  target: number
  unlockedAt?: string
}

export interface GithubDay {
  id?: number
  activityDate: string
  repoName: string
  commitCount: number
  syncedAt: string
}

export interface Setting {
  key: string
  value: unknown
  updatedAt: string
}

export interface HandleRow {
  key: string
  handle: FileSystemDirectoryHandle
}
