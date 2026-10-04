import { getDb } from '../core/db/db'
import { localDate, addDaysLocal } from '../core/domain/time'
import { dailyStreak, weeklyStreak } from '../core/domain/streak'
import { questBaseXp, habitBaseXp } from '../core/domain/xp'
import type { HabitItem, QuestItem, ActivityEntry } from '../pages/Dashboard/dashboard-data'

const FREQ_LABEL = { daily: 'Daily', weekly: 'Weekly' } as const

export interface ManagedHabitItem extends HabitItem {
  done: boolean
  archived: boolean
  frequency: 'Daily' | 'Weekly'
}

export async function listHabitItems(view: 'today' | 'all' | 'archived' = 'today'): Promise<ManagedHabitItem[]> {
  const db = getDb()
  const habits = await db.habits.toArray()
  const today = localDate(new Date())
  const out: ManagedHabitItem[] = []
  for (const h of habits) {
    if (view === 'archived' && !h.archived) continue
    if (view !== 'archived' && h.archived) continue
    if (view === 'today' && h.createdLocalDate > today) continue
    const logs = await db.habitLogs.where('habitId').equals(h.id!).toArray()
    const dates = new Set(logs.map((l) => l.logDate))
    const streak = h.frequency === 'daily' ? dailyStreak(dates, today) : weeklyStreak(dates, today, 'monday')
    const weekAgo = today
    const recentDays = h.frequency === 'daily' ? 14 : 8
    const window = new Set<string>()
    for (let i = 0; i < recentDays; i++) window.add(addDaysLocal(weekAgo, -i))
    const doneInWindow = dates.size > 0 ? [...dates].filter((d) => window.has(d)).length : 0
    const consistency = h.frequency === 'daily' ? Math.round((doneInWindow / recentDays) * 100) : Math.min(100, Math.round((doneInWindow / (recentDays / 7)) * 100))
    const doneToday = h.frequency === 'daily' ? dates.has(today) : dates.has(today) || weekDatesHasThisWeek(dates)
    out.push({
      id: String(h.id),
      name: h.name,
      attributes: h.attributes,
      difficulty: h.difficulty >= 4 ? 'Hard' : h.difficulty >= 3 ? 'Med' : 'Easy',
      streak,
      consistency,
      reward: habitBaseXp(),
      rewardType: 'XP',
      initialDone: doneToday,
      done: doneToday,
      archived: h.archived,
      frequency: FREQ_LABEL[h.frequency],
    })
  }
  return out
}

function weekDatesHasThisWeek(dates: Set<string>): boolean {
  const start = new Date()
  const diff = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - diff)
  const startStr = localDate(start)
  return [...dates].some((d) => d >= startStr)
}

export async function listQuestItems(): Promise<QuestItem[]> {
  const db = getDb()
  const quests = await db.quests.where('status').equals('active').toArray()
  return quests.map((q) => ({
    id: String(q.id),
    category: q.type,
    linkedGoal: q.goalId !== undefined ? `Goal #${q.goalId}` : undefined,
    deadline: q.deadline,
    title: q.title,
    description: q.description,
    baseReward: q.baseXp,
    difficulty: q.difficulty,
    effort: q.effort,
    impact: q.impact,
    reward: questBaseXp(q.type, q.baseXp),
    rewardType: q.type === 'recovery' ? 'HP' : 'XP',
    attributeRewards: q.attributes,
  }))
}

export interface GoalView {
  id: string
  title: string
  target: string
  progress: number
  tone: string
  milestones: { id: string; title: string; done: boolean }[]
  status: string
  category: string
  attribute?: string
  deadline?: string
  description: string
}

export async function listGoalViews(): Promise<GoalView[]> {
  const db = getDb()
  const goals = await db.goals.toArray()
  const out: GoalView[] = []
  for (const g of goals) {
    const ms = await db.milestones.where('goalId').equals(g.id!).sortBy('orderIndex')
    const done = ms.filter((m) => m.status === 'done').length
    const progress = ms.length === 0 ? (g.status === 'completed' ? 100 : 0) : Math.floor((done / ms.length) * 100)
    out.push({
      id: String(g.id),
      title: g.title,
      target: `${g.deadline ? `Target: ${g.deadline} · ` : ''}${done}/${ms.length} Milestones`,
      progress,
      tone: 'gold',
      milestones: ms.map((m) => ({ id: String(m.id), title: m.title, done: m.status === 'done' })),
      status: g.status,
      category: g.category,
      attribute: g.attribute,
      deadline: g.deadline,
      description: g.description,
    })
  }
  return out
}

export async function getXpTotals(): Promise<{ today: number; week: number; month: number }> {
  const db = getDb()
  const today = localDate(new Date())
  const weekAgo = addDaysLocal(today, -6)
  const monthAgo = addDaysLocal(today, -29)
  const rows = await db.xpLedger.where('localDate').between(monthAgo, today, true, true).toArray()
  let week = 0
  let month = 0
  let todaySum = 0
  for (const r of rows) {
    month += r.xpAmount
    if (r.localDate >= weekAgo) week += r.xpAmount
    if (r.localDate === today) todaySum += r.xpAmount
  }
  return { today: todaySum, week, month }
}

export async function listActivity(limit = 10): Promise<ActivityEntry[]> {
  const db = getDb()
  const events = await db.timelineEvents.orderBy('id').reverse().limit(limit).toArray()
  return events.map((e) => ({
    id: String(e.id),
    time: `${e.createdAt.slice(11, 16)} ${e.localDate === localDate(new Date()) ? 'TODAY' : e.localDate}`,
    title: e.title,
    reward: e.xpDelta ? `+${e.xpDelta} XP` : e.healthDelta ? `${e.healthDelta > 0 ? '+' : ''}${e.healthDelta} HP` : '',
    detail: e.note || e.eventType,
    tone: e.healthDelta !== undefined ? 'health' : 'xp',
  }))
}
