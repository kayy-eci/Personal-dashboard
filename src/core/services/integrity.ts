import { getDb } from '../db/db'

/** Returns a list of integrity problems; empty when clean. */
export async function verifyIntegrity(): Promise<string[]> {
  const db = getDb()
  const problems: string[] = []

  const [profile, ledger, attrs, milestones, quests, habits, goals, achievements, questsCompleted, goalsCompleted] = await Promise.all([
    db.profile.get(1),
    db.xpLedger.toArray(),
    db.attributeStats.toArray(),
    db.milestones.toArray(),
    db.quests.toArray(),
    db.habits.toArray(),
    db.goals.toArray(),
    db.achievements.toArray(),
    db.quests.where('status').equals('completed').count(),
    db.goals.where('status').equals('completed').count(),
  ])

  if (profile) {
    const ledgerSum = ledger.reduce((s, r) => s + r.xpAmount, 0)
    if (ledgerSum !== profile.totalXp) problems.push(`totalXp ${profile.totalXp} != ledger ${ledgerSum}`)
    if (profile.health < 0 || profile.health > profile.maxHealth) problems.push(`health ${profile.health} out of range`)
  }

  for (const a of attrs) {
    const sum = ledger.filter((r) => r.attribute === a.attribute).reduce((s, r) => s + r.xpAmount, 0)
    if (sum !== a.xp) problems.push(`attribute ${a.attribute} xp ${a.xp} != ledger ${sum}`)
  }

  const goalIds = new Set(goals.map((g) => g.id))
  for (const m of milestones) if (!goalIds.has(m.goalId)) problems.push(`milestone ${m.id} points at missing goal ${m.goalId}`)
  for (const q of quests) if (q.goalId !== undefined && !goalIds.has(q.goalId)) problems.push(`quest ${q.id} points at missing goal ${q.goalId}`)
  for (const h of habits) if (h.goalId !== undefined && !goalIds.has(h.goalId)) problems.push(`habit ${h.id} points at missing goal ${h.goalId}`)

  // achievements vs conditions
  const bestStreak = profile?.bestStreak ?? 0
  const checks: [string, boolean][] = [
    ['first_quest', questsCompleted >= 1],
    ['streak_7', bestStreak >= 7],
    ['streak_30', bestStreak >= 30],
    ['quests_10', questsCompleted >= 10],
    ['first_goal_completed', goalsCompleted >= 1],
  ]
  for (const [key, shouldBeUnlocked] of checks) {
    const row = achievements.find((a) => a.ruleKey === key)
    if (row) {
      const isUnlocked = !!row.unlockedAt
      if (shouldBeUnlocked && !isUnlocked) problems.push(`achievement ${key} should be unlocked`)
      if (!shouldBeUnlocked && isUnlocked) problems.push(`achievement ${key} should not be unlocked`)
    }
  }

  return problems
}
