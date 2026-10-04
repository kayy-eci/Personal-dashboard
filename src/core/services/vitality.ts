import { getDb } from '../db/db'
import { addDaysLocal, localDate } from '../domain/time'
import { getSetting, setSetting } from '../settings/repo'
import { profileStreak } from '../domain/streak'
import { publish } from '../platform/events'

/**
 * Catch-up vitality check. Iterates each missed local date since
 * health.lastCheckedDate and applies losses idempotently via lossKey.
 */
export async function runDailyCheck(now: Date = new Date()): Promise<{ daysProcessed: number; hpLost: number }> {
  const db = getDb()
  const today = localDate(now)
  const lastChecked = await getSetting<string>('health.lastCheckedDate')
  if (!lastChecked || lastChecked > today) {
    return { daysProcessed: 0, hpLost: 0 }
  }

  let hpLost = 0
  let daysProcessed = 0
  let cursor = addDaysLocal(lastChecked, 1)

  const lossPerHabit = await getSetting<number>('health.lossPerMissedHabit')
  const lossPerQuest = await getSetting<number>('health.lossPerMissedQuest')

  while (cursor < today) {
    const d = cursor
    daysProcessed++

    const scheduled = await db.habits
      .filter((h) => h.frequency === 'daily' && !h.archived && h.createdLocalDate <= d)
      .toArray()
    const done = new Set<number>()
    for (const h of scheduled) {
      const log = await db.habitLogs.where('[habitId+logDate]').equals([h.id!, d]).first()
      if (log) done.add(h.id!)
    }
    const missedQuests = await db.quests
      .filter((q) => !q.archived && q.deadline === d && q.createdLocalDate <= d && (q.status !== 'completed' || (q.completedLocalDate ?? '') > d))
      .count()

    const missedHabits = scheduled.length - done.size
    const habitLoss = missedHabits * lossPerHabit
    const questLoss = missedQuests * lossPerQuest

    await db.transaction('rw', [db.healthLogs, db.profile, db.settings, db.timelineEvents], async () => {
      const profile = await db.profile.get(1)
      if (!profile) return
      let healthAfter = profile.health
      const losses: { kind: 'missed_habit' | 'missed_quest'; amount: number; reason: string; lossKey: string }[] = []
      if (habitLoss > 0) losses.push({ kind: 'missed_habit', amount: habitLoss, reason: `${missedHabits} daily habit(s) not done`, lossKey: `${d}:missed_habit` })
      if (questLoss > 0) losses.push({ kind: 'missed_quest', amount: questLoss, reason: `${missedQuests} quest(s) past due`, lossKey: `${d}:missed_quest` })
      let recorded = 0
      for (const l of losses) {
        const existing = await db.healthLogs.where('lossKey').equals(l.lossKey).first()
        if (existing) continue
        healthAfter = Math.max(0, healthAfter - l.amount)
        await db.healthLogs.add({ logDate: d, kind: l.kind, changeAmount: -l.amount, reason: l.reason, healthAfter, lossKey: l.lossKey, createdAt: new Date().toISOString() })
        recorded += l.amount
      }
      if (recorded > 0) {
        await db.profile.update(1, { health: healthAfter })
        const total = recorded
        const title =
          missedQuests > 0
            ? `${missedHabits} of ${scheduled.length} daily habits not done, ${missedQuests} quest(s) past due · −${total} HP`
            : `${missedHabits} of ${scheduled.length} daily habits not done · −${total} HP`
        await db.timelineEvents.add({ eventType: 'vitality_loss', title, note: '', healthDelta: -total, localDate: d, createdAt: new Date().toISOString() })
        hpLost += total
      }
      await setSetting('health.lastCheckedDate', d)
    })

    cursor = addDaysLocal(cursor, 1)
  }

  // recompute profile streak once after all dates
  const logs = await db.habitLogs.toArray()
  const dailyDates = new Set<string>()
  for (const l of logs) {
    const h = await db.habits.get(l.habitId)
    if (h && h.frequency === 'daily' && !h.archived) dailyDates.add(l.logDate)
  }
  const { current, best, lastStreakDate } = profileStreak(dailyDates, today)
  await db.profile.update(1, { currentStreak: current, bestStreak: best, lastStreakDate })

  if (daysProcessed > 0) publish('data')
  return { daysProcessed, hpLost }
}
