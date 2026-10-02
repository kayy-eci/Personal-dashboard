/**
 * Player status model.
 *
 * These types mirror the PRD's system-determined stats (§3.6–§3.8): the user
 * never edits attributes, health or XP by hand — they are derived from
 * completed habits, quests and milestones. The UI only displays them.
 */

/** The six system attributes (PRD §3.6). */
export type AttributeKey =
  | 'STR'
  | 'INT'
  | 'DISC'
  | 'CREAT'
  | 'FOCUS'
  | 'SOC'

export interface AttributeStat {
  key: AttributeKey
  label: string
  level: number
  xp: number
  /** XP required to reach the next level of this attribute. */
  xpToNextLevel: number
}

/**
 * One entry in the health log (PRD §3.8). `reason` is shown verbatim, so
 * copy must stay neutral — no guilt or shame framing (PRD §7.3).
 */
export interface HealthLogEntry {
  id: string
  /** Positive for a gain, negative for a loss. */
  change: number
  healthAfter: number
  reason: string
  createdAt: string
}

export interface PlayerProfile {
  id: string
  name: string
  /** Data URL of the profile picture, or null when none is set. */
  avatarSrc: string | null
}

export interface PlayerStatus {
  level: number
  totalXp: number
  /** XP earned toward the next level. */
  xpIntoLevel: number
  /** XP required for the next level. */
  xpForNextLevel: number
  health: number
  maxHealth: number
  currentStreak: number
  attributes: AttributeStat[]
  recentHealthLog: HealthLogEntry[]
}

/** HP/energy, clamped so a stored value can never render an overfull bar. */
export function healthPercent(health: number, maxHealth: number): number {
  if (maxHealth <= 0) return 0
  return Math.min(100, Math.max(0, (health / maxHealth) * 100))
}

export function xpPercent(xp: number, xpForNextLevel: number): number {
  if (xpForNextLevel <= 0) return 0
  return Math.min(100, Math.max(0, (xp / xpForNextLevel) * 100))
}