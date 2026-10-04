import type { Habit, Attribute, XpLedgerRow } from '../db/types'
import type { XpBreakdown } from '../domain/xp'
import { computeXp, consistencyMultiplier, habitBaseXp, milestoneBaseXp, goalBonusBaseXp, questBaseXp, FORMULA_VERSION } from '../domain/xp'
import { applyAttributeCap, applyTrivialCap, withCap } from '../domain/caps'
import { resolveAttributes, splitXp } from '../domain/attributes'
import { levelFromTotalXp, detectAttributeLevelUps, detectLevelUps } from '../domain/levels'
import { dailyStreak, profileStreak } from '../domain/streak'
import { localDate, addDaysLocal, weekStartOf } from '../domain/time'
import { evaluateAchievements } from '../domain/achievements'
import { getSetting } from '../settings/repo'
import { getDb } from '../db/db'
import { publish } from '../platform/events'
import { DataError } from '../db/errors'

export interface CompletionResult {
  xpGained: number
  breakdown: XpBreakdown
  attributeChanges: { attribute: Attribute; xpAdded: number; newLevel?: number; leveledUp: boolean }[]
  levelUp: { from: number; to: number } | null
  vitalityChange: { delta: number; healthAfter: number } | null
  goalProgress: { goalId: number; percent: number; milestoneCompleted?: boolean; goalCompleted?: boolean } | null
  unlockedAchievements: { ruleKey: string; name: string }[]
  streak: { current: number; best: number }
}

const db = () => getDb()

async function todayAttributeXp(attr: Attribute, today: string): Promise<number> {
  const rows = await db().xpLedger.where('[attribute+localDate]').equals([attr, today]).toArray()
  return rows.reduce((s, r) => s + r.xpAmount, 0)
}

async function appendXp(opts: {
  sourceType: XpLedgerRow['sourceType']
  sourceId: number
  base: number
  difficulty?: number
  effort?: number
  impact?: number
  consistencyStreakDays?: number
  attributes: Attribute[]
  category?: string
  goalAttribute?: Attribute
  today: string
  cap?: { rule: string; attribute?: Attribute; multiplier: number } | null
  trivialCap?: boolean
}): Promise<{ xpGained: number; breakdown: XpBreakdown; attributeChanges: CompletionResult['attributeChanges']; levelUp: CompletionResult['levelUp'] }> {
  const consistencyMult = opts.consistencyStreakDays !== undefined ? consistencyMultiplier(opts.consistencyStreakDays) : 1
  let breakdown = computeXp({
    base: opts.base,
    difficulty: opts.difficulty,
    effort: opts.effort,
    impact: opts.impact,
    consistencyMultiplier: consistencyMult,
    consistencyStreakDays: opts.consistencyStreakDays ?? 0,
  })

  if (opts.trivialCap) {
    const trivialToday = await countTrivialQuestsToday(opts.today)
    const r = applyTrivialCap(breakdown.final, trivialToday)
    breakdown = withCap(breakdown, r.final, r.cap)
  }

  const attrs = resolveAttributes(opts.attributes, opts.goalAttribute, opts.category)
  const parts = splitXp(breakdown.final, attrs)
  const now = new Date().toISOString()
  const attributeChanges: CompletionResult['attributeChanges'] = []
  let xpGained = 0

  const addRow = async (attribute: Attribute | null, xp: number, capped: XpBreakdown) => {
    await db().xpLedger.add({
      sourceType: opts.sourceType,
      sourceId: opts.sourceId,
      attribute,
      xpAmount: xp,
      breakdown: capped,
      formulaVersion: FORMULA_VERSION,
      localDate: opts.today,
      createdAt: now,
    })
  }

  if (attrs.length === 0) {
    await addRow(null, breakdown.final, breakdown)
    xpGained = breakdown.final
  } else {
    for (const part of parts) {
      const todayTotal = await todayAttributeXp(part.attribute, opts.today)
      const r = applyAttributeCap(part.xp, todayTotal)
      const capped = r.cap ? withCap(breakdown, r.final, r.cap, part.attribute) : { ...breakdown, final: r.final }
      await addRow(part.attribute, r.final, capped)
      xpGained += r.final

      const row = await db().attributeStats.get(part.attribute)
      const prevXp = row?.xp ?? 0
      const newXp = prevXp + r.final
      const newLevel = levelFromTotalXp(newXp, false)
      await db().attributeStats.put({ attribute: part.attribute, xp: newXp, level: newLevel })
      const lvlUp = detectAttributeLevelUps(prevXp, newXp)
      attributeChanges.push({ attribute: part.attribute, xpAdded: r.final, newLevel, leveledUp: !!lvlUp })
      if (lvlUp) {
        await db().timelineEvents.add({
          eventType: 'attribute_level_up',
          refType: 'attribute',
          refId: 0,
          title: `${part.attribute} reached level ${lvlUp.to}`,
          note: '',
          localDate: opts.today,
          createdAt: now,
        })
      }
    }
  }

  // profile caches
  let levelUp: CompletionResult['levelUp'] = null
  const profile = await db().profile.get(1)
  if (profile) {
    const newTotal = profile.totalXp + xpGained
    const lu = detectLevelUps(profile.totalXp, newTotal)
    await db().profile.put({ ...profile, totalXp: newTotal, level: levelFromTotalXp(newTotal, true), updatedAt: now })
    levelUp = lu
    if (levelUp) {
      await db().timelineEvents.add({
        eventType: 'level_up',
        refType: 'profile',
        refId: 1,
        title: `Reached level ${levelUp.to}`,
        note: '',
        localDate: opts.today,
        createdAt: now,
      })
    }
  }

  return { xpGained, breakdown, attributeChanges, levelUp }
}

async function countTrivialQuestsToday(today: string): Promise<number> {
  const rows = await db().xpLedger.where('localDate').equals(today).toArray()
  let count = 0
  for (const r of rows) {
    if (r.sourceType !== 'quest') continue
    const q = await db().quests.get(r.sourceId)
    if (q && q.difficulty === 1 && q.effort === 1) count++
  }
  return count
}

async function recomputeProfileStreak(today: string): Promise<{ current: number; best: number }> {
  const logs = await db().habitLogs.toArray()
  const dailyLogDates = new Set<string>()
  for (const l of logs) {
    const h = await db().habits.get(l.habitId)
    if (h && h.frequency === 'daily' && !h.archived) dailyLogDates.add(l.logDate)
  }
  const { current, best, lastStreakDate } = profileStreak(dailyLogDates, today)
  const profile = await db().profile.get(1)
  if (profile) await db().profile.put({ ...profile, currentStreak: current, bestStreak: best, lastStreakDate, updatedAt: new Date().toISOString() })
  return { current, best }
}

async function evaluateAchievementsAndUnlock(today: string): Promise<{ ruleKey: string; name: string }[]> {
  const quests = await db().quests.where('status').equals('completed').count()
  const goals = await db().goals.where('status').equals('completed').count()
  const profile = await db().profile.get(1)

  const evals = evaluateAchievements({ completedQuests: quests, bestStreak: profile?.bestStreak ?? 0, completedGoals: goals })
  const rows = await db().achievements.toArray()
  const unlocked: { ruleKey: string; name: string }[] = []
  const now = new Date().toISOString()
  for (const e of evals) {
    const row = rows.find((r) => r.ruleKey === e.ruleKey)
    if (e.unlocked && row && !row.unlockedAt) {
      await db().achievements.put({ ...row, unlockedAt: now })
      await db().timelineEvents.add({
        eventType: 'achievement_unlocked',
        refType: 'achievement',
        refId: 0,
        title: `Achievement unlocked: ${e.name}`,
        note: '',
        localDate: today,
        createdAt: now,
      })
      unlocked.push({ ruleKey: e.ruleKey, name: e.name })
    }
  }
  return unlocked
}

export async function checkInHabit(habitId: number, date?: string): Promise<CompletionResult> {
  const today = localDate(new Date())
  const logDate = date ?? today
  if (logDate !== today && logDate !== addDaysLocal(today, -1)) {
    throw new DataError('VALIDATION', 'Habit check-in date must be today or yesterday')
  }

  return db().transaction('rw', [db().habits, db().habitLogs, db().xpLedger, db().attributeStats, db().profile, db().timelineEvents, db().achievements, db().quests, db().goals], async () => {
    const habit = await db().habits.get(habitId)
    if (!habit || habit.archived) throw new DataError('NOT_FOUND', 'Habit not found')

    // weekly habit: once per week
    if (habit.frequency === 'weekly') {
      const targetKey = weekStartOf(logDate)
      const logs = await db().habitLogs.where('habitId').equals(habitId).toArray()
      const clash = logs.some((l) => weekStartOf(l.logDate) === targetKey)
      if (clash) throw new DataError('ALREADY_CHECKED_IN', 'Weekly habit already checked in this week')
    } else {
      const existing = await db().habitLogs.where('[habitId+logDate]').equals([habitId, logDate]).first()
      if (existing) throw new DataError('ALREADY_CHECKED_IN', 'Already checked in for this date')
    }

    const habitStreak = await habitCurrentStreak(habit, logDate)
    await db().habitLogs.add({ habitId, logDate, createdAt: new Date().toISOString() })

    const award = await appendXp({
      sourceType: 'habit',
      sourceId: habitId,
      base: habitBaseXp(),
      difficulty: habit.difficulty,
      impact: habit.impact,
      consistencyStreakDays: habitStreak,
      attributes: habit.attributes,
      category: habit.category,
      today: logDate,
    })

    const now = new Date().toISOString()
    const todayStr = localDate(new Date())
    const streak = await recomputeProfileStreak(todayStr)
    await db().timelineEvents.add({
      eventType: 'habit_checkin',
      refType: 'habit',
      refId: habitId,
      title: `Checked in: ${habit.name}`,
      note: '',
      xpDelta: award.xpGained,
      localDate: logDate,
      createdAt: now,
    })
    const unlocked = await evaluateAchievementsAndUnlock(logDate)
    const result = {
      xpGained: award.xpGained,
      breakdown: award.breakdown,
      attributeChanges: award.attributeChanges,
      levelUp: award.levelUp,
      vitalityChange: null,
      goalProgress: null,
      unlockedAchievements: unlocked,
      streak,
    }
    return result
  })
  .then((r) => {
    publish('data')
    return r
  })
}

async function habitCurrentStreak(habit: Habit, beforeDate: string): Promise<number> {
  const logs = await db().habitLogs.where('habitId').equals(habit.id!).toArray()
  const dates = new Set(logs.map((l) => l.logDate).filter((d) => d < beforeDate))
  if (habit.frequency === 'daily') return dailyStreak(dates, addDaysLocal(beforeDate, -1))
  const weeks = new Set([...dates].map((d) => weekStartOf(d)))
  const thisWeek = weekStartOf(beforeDate)
  const lastWeek = weekStartOf(addDaysLocal(thisWeek, -7))
  const start = weeks.has(thisWeek) ? thisWeek : weeks.has(lastWeek) ? lastWeek : null
  if (!start) return 0
  let count = 0
  let t = start
  while (weeks.has(t)) {
    count++
    t = weekStartOf(addDaysLocal(t, -7))
  }
  return count
}

export async function completeQuest(questId: number): Promise<CompletionResult> {
  const today = localDate(new Date())
  return db().transaction('rw', [db().quests, db().xpLedger, db().attributeStats, db().profile, db().timelineEvents, db().healthLogs, db().achievements, db().goals, db().milestones, db().habits, db().habitLogs, db().settings], async () => {
    const quest = await db().quests.get(questId)
    if (!quest || quest.status === 'archived') throw new DataError('NOT_FOUND', 'Quest not found')
    if (quest.status === 'completed') throw new DataError('ALREADY_COMPLETED', 'Quest already completed')

    let vitalityChange: CompletionResult['vitalityChange'] = null

    if (quest.type === 'recovery') {
      const todayRecovery = await db().healthLogs.where('logDate').equals(today).filter((h) => h.kind === 'recovery').count()
      const limit = await getRecoveryLimit()
      if (todayRecovery >= limit) throw new DataError('RECOVERY_LIMIT_REACHED', 'Daily recovery limit reached')
    }

    const trivial = quest.difficulty === 1 && quest.effort === 1
    const award = await appendXp({
      sourceType: 'quest',
      sourceId: questId,
      base: questBaseXp(quest.type, quest.baseXp),
      difficulty: quest.difficulty,
      effort: quest.effort,
      impact: quest.impact,
      attributes: quest.attributes,
      category: quest.category,
      today,
      trivialCap: trivial,
    })

    await db().quests.update(questId, { status: 'completed', completedAt: new Date().toISOString(), completedLocalDate: today })

    if (quest.type === 'recovery') {
      const profile = await db().profile.get(1)
      const gain = await recoveryAmountFor()
      const healthAfter = Math.min(profile!.maxHealth, profile!.health + gain)
      const delta = healthAfter - profile!.health
      await db().profile.put({ ...profile!, health: healthAfter, updatedAt: new Date().toISOString() })
      await db().healthLogs.add({ logDate: today, kind: 'recovery', changeAmount: delta, reason: `Recovery quest: ${quest.title}`, healthAfter, createdAt: new Date().toISOString() })
      await db().timelineEvents.add({ eventType: 'vitality_gain', refType: 'quest', refId: questId, title: `Recovery quest: ${quest.title} · +${delta} HP`, note: '', healthDelta: delta, localDate: today, createdAt: new Date().toISOString() })
      vitalityChange = { delta, healthAfter }
    }

    let goalProgress: CompletionResult['goalProgress'] = null
    if (quest.goalId) {
      goalProgress = await recomputeGoal(quest.goalId, today)
    }

    await db().timelineEvents.add({
      eventType: 'quest_completed',
      refType: 'quest',
      refId: questId,
      title: `Completed: ${quest.title}`,
      note: '',
      xpDelta: award.xpGained,
      localDate: today,
      createdAt: new Date().toISOString(),
    })

    const streak = await recomputeProfileStreak(today)
    const unlocked = await evaluateAchievementsAndUnlock(today)
    return { xpGained: award.xpGained, breakdown: award.breakdown, attributeChanges: award.attributeChanges, levelUp: award.levelUp, vitalityChange, goalProgress, unlockedAchievements: unlocked, streak }
  }).then((r) => {
    publish('data')
    return r
  })
}

async function recomputeGoal(goalId: number, today: string): Promise<CompletionResult['goalProgress']> {
  const goal = await db().goals.get(goalId)
  if (!goal) return null
  const milestones = await db().milestones.where('goalId').equals(goalId).toArray()
  const done = milestones.filter((m) => m.status === 'done').length
  const percent = milestones.length === 0 ? 0 : Math.floor((done / milestones.length) * 100)
  let goalCompleted = false
  if (milestones.length > 0 && done === milestones.length && goal.status === 'active') {
    await db().goals.update(goalId, { status: 'completed', completedAt: new Date().toISOString() })
    goalCompleted = true
    // goal bonus
    const bonus = await appendXp({
      sourceType: 'goal',
      sourceId: goalId,
      base: goalBonusBaseXp(),
      attributes: [],
      goalAttribute: goal.attribute,
      category: goal.category,
      today,
    })
    await db().timelineEvents.add({ eventType: 'goal_completed', refType: 'goal', refId: goalId, title: `Goal completed: ${goal.title}`, note: '', xpDelta: bonus.xpGained, localDate: today, createdAt: new Date().toISOString() })
  }
  return { goalId, percent, goalCompleted }
}

export async function completeMilestone(milestoneId: number): Promise<CompletionResult> {
  const today = localDate(new Date())
  return db().transaction('rw', [db().milestones, db().goals, db().quests, db().xpLedger, db().attributeStats, db().profile, db().timelineEvents, db().achievements, db().habits, db().habitLogs], async () => {
    const milestone = await db().milestones.get(milestoneId)
    if (!milestone) throw new DataError('NOT_FOUND', 'Milestone not found')
    if (milestone.status === 'done') throw new DataError('ALREADY_COMPLETED', 'Milestone already done')
    const goal = await db().goals.get(milestone.goalId)
    if (!goal) throw new DataError('NOT_FOUND', 'Goal not found')

    await db().milestones.update(milestoneId, { status: 'done', completedAt: new Date().toISOString() })
    const award = await appendXp({
      sourceType: 'milestone',
      sourceId: milestoneId,
      base: milestoneBaseXp(),
      attributes: [],
      goalAttribute: goal.attribute,
      category: goal.category,
      today,
    })
    await db().timelineEvents.add({ eventType: 'milestone_completed', refType: 'milestone', refId: milestoneId, title: `Milestone completed: ${milestone.title}`, note: '', xpDelta: award.xpGained, localDate: today, createdAt: new Date().toISOString() })
    const goalProgress = await recomputeGoal(milestone.goalId, today)
    const streak = await recomputeProfileStreak(today)
    const unlocked = await evaluateAchievementsAndUnlock(today)
    return { xpGained: award.xpGained, breakdown: award.breakdown, attributeChanges: award.attributeChanges, levelUp: award.levelUp, vitalityChange: null, goalProgress: goalProgress ? { ...goalProgress, milestoneCompleted: true } : null, unlockedAchievements: unlocked, streak }
  }).then((r) => {
    publish('data')
    return r
  })
}

async function getRecoveryLimit(): Promise<number> {
  return getSetting<number>('health.recoveryDailyLimit')
}

async function recoveryAmountFor(): Promise<number> {
  return getSetting<number>('health.recoveryAmount')
}
