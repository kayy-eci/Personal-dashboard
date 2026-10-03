import Dexie, { type Table } from 'dexie'
import type * as T from './types'

export const LEDGER_GUARD = { allowWrites: false }

export class LifeOSDb extends Dexie {
  profile!: Table<T.Profile, number>
  attributeStats!: Table<T.AttributeStatRow, string>
  goals!: Table<T.Goal, number>
  milestones!: Table<T.Milestone, number>
  quests!: Table<T.Quest, number>
  habits!: Table<T.Habit, number>
  habitLogs!: Table<T.HabitLog, number>
  xpLedger!: Table<T.XpLedgerRow, number>
  healthLogs!: Table<T.HealthLog, number>
  timelineEvents!: Table<T.TimelineEvent, number>
  achievements!: Table<T.AchievementRow, string>
  githubActivity!: Table<T.GithubDay, number>
  settings!: Table<T.Setting, string>
  handles!: Table<T.HandleRow, string>

  constructor(name = 'lifeos') {
    super(name)
    this.version(1).stores({
      profile: 'id',
      attributeStats: 'attribute',
      goals: '++id, status, deadline',
      milestones: '++id, goalId, [goalId+orderIndex], status',
      quests: '++id, goalId, milestoneId, type, status, deadline, scheduledDate, completedLocalDate, *attributes',
      habits: '++id, goalId, frequency, archived, *attributes',
      habitLogs: '++id, habitId, logDate, &[habitId+logDate]',
      xpLedger: '++id, localDate, attribute, [attribute+localDate], [sourceType+sourceId]',
      healthLogs: '++id, logDate, kind, &lossKey',
      timelineEvents: '++id, localDate, eventType, [localDate+id], [eventType+localDate]',
      achievements: 'ruleKey',
      githubActivity: '++id, activityDate, &[activityDate+repoName]',
      settings: 'key',
      handles: 'key',
    })

    const deny = () => {
      if (!LEDGER_GUARD.allowWrites) throw new Error('XP ledger is append-only')
    }
    this.xpLedger.hook('updating', deny)
    this.xpLedger.hook('deleting', deny)
  }
}

let instance: LifeOSDb | null = null

export function getDb(): LifeOSDb {
  if (!instance) instance = new LifeOSDb()
  return instance
}

/** For tests: swap in an isolated database. */
export function setDbForTests(db: LifeOSDb | null): void {
  instance = db
}

export async function seedDatabase(db: LifeOSDb): Promise<void> {
  await db.attributeStats.bulkPut([
    { attribute: 'STR', xp: 0, level: 1 },
    { attribute: 'INT', xp: 0, level: 1 },
    { attribute: 'DISC', xp: 0, level: 1 },
    { attribute: 'CREAT', xp: 0, level: 1 },
    { attribute: 'FOCUS', xp: 0, level: 1 },
    { attribute: 'SOC', xp: 0, level: 1 },
  ])
  const existing = await db.achievements.count()
  if (existing === 0) {
    const { ACHIEVEMENT_DEFS } = await import('../domain/achievements')
    await db.achievements.bulkPut(
      ACHIEVEMENT_DEFS.map((d) => ({ ruleKey: d.ruleKey, name: d.name, description: d.description, target: d.target })),
    )
  }
}
