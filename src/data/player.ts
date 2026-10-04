import { getDb } from '../core/db/db'
import { progressInLevel } from '../core/domain/levels'
import type { PlayerStatus } from '../features/player/types'

export async function getPlayerStatus(): Promise<PlayerStatus | null> {
  const db = getDb()
  const profile = await db.profile.get(1)
  if (!profile) return null
  const attrs = await db.attributeStats.toArray()
  const healthLog = await db.healthLogs.orderBy('id').reverse().limit(30).toArray()
  const { level, xpIntoLevel, xpForNext } = progressInLevel(profile.totalXp)
  const attrByKey = new Map(attrs.map((a) => [a.attribute, a]))
  const LABELS: Record<string, string> = {
    STR: 'Strength',
    INT: 'Intellect',
    DISC: 'Discipline',
    CREAT: 'Creativity',
    FOCUS: 'Focus',
    SOC: 'Social',
  }
  return {
    level,
    totalXp: profile.totalXp,
    xpIntoLevel,
    xpForNextLevel: xpForNext,
    health: profile.health,
    maxHealth: profile.maxHealth,
    currentStreak: profile.currentStreak,
    attributes: (['STR', 'INT', 'DISC', 'CREAT', 'FOCUS', 'SOC'] as const).map((k) => {
      const a = attrByKey.get(k)
      return { key: k, label: LABELS[k], level: a?.level ?? 1, xp: a?.xp ?? 0, xpToNextLevel: 60 + 15 * (a?.level ?? 1) }
    }),
    recentHealthLog: healthLog.map((h) => ({ id: String(h.id), change: h.changeAmount, healthAfter: h.healthAfter, reason: h.reason, createdAt: h.createdAt })),
  }
}
