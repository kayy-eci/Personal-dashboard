import type { PlayerStatus } from './types'

/**
 * Sample status until a backend exists.
 *
 * IMPORTANT: these numbers are illustrative placeholders, not real progress.
 * Once the API lands, this becomes a fetch/query hook and the numbers are
 * derived by the server from actual habit and quest completions (PRD §5).
 */
export function usePlayerStatus(): PlayerStatus {
  return {
    level: 26,
    totalXp: 2510,
    xpIntoLevel: 10,
    xpForNextLevel: 100,
    health: 72,
    maxHealth: 100,
    currentStreak: 9,
    attributes: [
      { key: 'STR', label: 'Strength', level: 11, xp: 820, xpToNextLevel: 1000 },
      { key: 'INT', label: 'Intellect', level: 5, xp: 430, xpToNextLevel: 1000 },
      { key: 'DISC', label: 'Discipline', level: 7, xp: 640, xpToNextLevel: 1000 },
      { key: 'CREAT', label: 'Creativity', level: 4, xp: 355, xpToNextLevel: 1000 },
      { key: 'FOCUS', label: 'Focus', level: 2, xp: 180, xpToNextLevel: 1000 },
      { key: 'SOC', label: 'Social', level: 5, xp: 470, xpToNextLevel: 1000 },
    ],
    recentHealthLog: [
      {
        id: 'h1',
        change: -4,
        healthAfter: 72,
        reason: 'Two daily habits were not completed.',
        createdAt: '2026-02-09T21:00:00.000Z',
      },
      {
        id: 'h2',
        change: 6,
        healthAfter: 76,
        reason: 'Recovery quest completed.',
        createdAt: '2026-02-08T18:30:00.000Z',
      },
    ],
  }
}