// One-off generator for tests/fixtures/legacy-backup-v1.json (old export format).
// Checksum matches the old algorithm: SHA-256 over JSON.stringify(tables).
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const now = '2026-10-01T08:00:00.000Z'

const breakdown = (final, base = 60) => ({
  base,
  difficulty: { rating: 2, multiplier: 1 },
  effort: { rating: 2, multiplier: 1 },
  impact: { rating: 2, multiplier: 1 },
  consistency: { streakDays: 0, multiplier: 1 },
  cap: null,
  formulaVersion: 1,
  final,
})

const tables = {
  profile: [
    { id: 1, name: 'Legacy User', avatar: undefined, level: 5, totalXp: 480, health: 80, maxHealth: 100, currentStreak: 4, bestStreak: 9, lastStreakDate: '2026-09-30', createdAt: now, updatedAt: now },
  ],
  attributeStats: [
    { attribute: 'STR', xp: 120, level: 3 },
    { attribute: 'INT', xp: 200, level: 3 },
    { attribute: 'DISC', xp: 60, level: 2 },
    { attribute: 'CREAT', xp: 40, level: 1 },
    { attribute: 'FOCUS', xp: 60, level: 2 },
    { attribute: 'SOC', xp: 0, level: 1 },
  ],
  goals: [
    { id: 1, title: 'Read more', description: 'Finish books', category: 'learning', attribute: 'INT', status: 'active', deadline: '2026-12-31', createdAt: now },
  ],
  milestones: [
    { id: 1, goalId: 1, title: 'Finish book one', orderIndex: 0, status: 'done', completedAt: now },
    { id: 2, goalId: 1, title: 'Finish book two', orderIndex: 1, status: 'pending' },
  ],
  quests: [
    { id: 1, goalId: 1, milestoneId: 2, title: 'Read chapter five', description: 'Pages 100-120', type: 'side', category: 'reading', difficulty: 2, effort: 2, impact: 2, attributes: ['INT'], scheduledDate: '2026-10-01', deadline: '2026-10-05', status: 'active', createdAt: now, createdLocalDate: '2026-10-01' },
    { id: 2, title: 'Evening walk', description: '', type: 'recovery', category: 'health', difficulty: 1, effort: 1, impact: 1, attributes: [], status: 'active', createdAt: now, createdLocalDate: '2026-10-01' },
    { id: 3, goalId: 1, title: 'Read chapter four', description: '', type: 'main', category: 'reading', difficulty: 3, effort: 3, impact: 3, baseXp: 100, attributes: ['INT'], status: 'completed', createdAt: now, createdLocalDate: '2026-09-28', completedAt: now, completedLocalDate: '2026-09-30' },
  ],
  habits: [
    { id: 1, name: 'Morning run', frequency: 'daily', category: 'fitness', difficulty: 3, impact: 3, attributes: ['STR'], archived: false, createdAt: now, createdLocalDate: '2026-09-20' },
    { id: 2, goalId: 1, name: 'Read pages', frequency: 'weekly', category: 'learning', difficulty: 2, impact: 4, attributes: ['INT'], archived: false, createdAt: now, createdLocalDate: '2026-09-20' },
  ],
  habitLogs: [
    { id: 1, habitId: 1, logDate: '2026-09-30', createdAt: now },
    { id: 2, habitId: 2, logDate: '2026-09-29', createdAt: now },
  ],
  xpLedger: [
    { id: 1, sourceType: 'habit', sourceId: 1, attribute: 'STR', xpAmount: 120, breakdown: breakdown(120, 15), formulaVersion: 1, localDate: '2026-09-30', createdAt: now },
    { id: 2, sourceType: 'quest', sourceId: 3, attribute: 'INT', xpAmount: 210, breakdown: breakdown(210, 100), formulaVersion: 1, localDate: '2026-09-30', createdAt: now },
    { id: 3, sourceType: 'milestone', sourceId: 1, attribute: 'INT', xpAmount: 150, breakdown: breakdown(150, 150), formulaVersion: 1, localDate: '2026-09-30', createdAt: now },
  ],
  healthLogs: [
    { id: 1, logDate: '2026-09-28', kind: 'missed_habit', changeAmount: -5, reason: 'Missed: Morning run', healthAfter: 95, lossKey: 'missed_habit:1:2026-09-28', createdAt: now },
  ],
  timelineEvents: [
    { id: 1, eventType: 'profile_created', title: 'Welcome, Legacy User', note: '', localDate: '2026-09-20', createdAt: now },
    { id: 2, eventType: 'habit_checkin', refType: 'habit', refId: 1, title: 'Checked in: Morning run', note: '', xpDelta: 120, localDate: '2026-09-30', createdAt: now },
    { id: 3, eventType: 'quest_completed', refType: 'quest', refId: 3, title: 'Completed: Read chapter four', note: '', xpDelta: 210, localDate: '2026-09-30', createdAt: now },
    { id: 4, eventType: 'level_up', refType: 'profile', refId: 1, title: 'Reached level 5', note: '', localDate: '2026-09-30', createdAt: now },
    { id: 5, eventType: 'vitality_loss', refType: 'profile', refId: 1, title: 'Missed: Morning run', note: '', healthDelta: -5, localDate: '2026-09-28', createdAt: now },
  ],
  achievements: [
    { ruleKey: 'first_quest', name: 'First quest', description: 'Complete your first quest', target: 1, unlockedAt: now },
    { ruleKey: 'streak_7', name: '7-day streak', description: 'Reach a 7-day streak', target: 7 },
    { ruleKey: 'streak_30', name: '30-day streak', description: 'Reach a 30-day streak', target: 30 },
    { ruleKey: 'quests_10', name: '10 quests', description: 'Complete 10 quests', target: 10 },
    { ruleKey: 'first_goal_completed', name: 'First goal', description: 'Complete your first goal', target: 1 },
  ],
  githubActivity: [
    { id: 1, activityDate: '2026-09-30', repoName: 'personal-dashboard', commitCount: 3, syncedAt: now },
  ],
  settings: [
    { key: 'health.max', value: 100, updatedAt: now },
    { key: 'health.recoveryDailyLimit', value: 2, updatedAt: now },
    { key: 'xp.formulaVersion', value: 1, updatedAt: now },
    { key: 'health.lastCheckedDate', value: '2026-09-30', updatedAt: now },
    { key: 'calendar.weekStart', value: 'monday', updatedAt: now },
    { key: 'github.username', value: 'legacy-user', updatedAt: now },
  ],
}

const canonical = JSON.stringify(tables)
const checksum = createHash('sha256').update(canonical, 'utf8').digest('hex')
const payload = { app: 'LifeOS', schemaVersion: 1, formulaVersion: 1, exportedAt: now, checksum, tables }
writeFileSync(join(dir, 'legacy-backup-v1.json'), JSON.stringify(payload, null, 2) + '\n')
console.log('wrote legacy-backup-v1.json, checksum', checksum.slice(0, 12))
