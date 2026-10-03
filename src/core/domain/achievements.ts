export interface AchievementDef {
  ruleKey: string
  name: string
  description: string
  target: number
  progress: (s: AchievementStats) => number
}

export interface AchievementStats {
  completedQuests: number
  bestStreak: number
  completedGoals: number
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { ruleKey: 'first_quest', name: 'First Quest', description: 'Complete 1 quest', target: 1, progress: (s) => s.completedQuests },
  { ruleKey: 'streak_7', name: '7-Day Streak', description: 'Keep a 7-day streak', target: 7, progress: (s) => s.bestStreak },
  { ruleKey: 'streak_30', name: '30-Day Streak', description: 'Keep a 30-day streak', target: 30, progress: (s) => s.bestStreak },
  { ruleKey: 'quests_10', name: '10 Quests Completed', description: 'Complete 10 quests', target: 10, progress: (s) => s.completedQuests },
  { ruleKey: 'first_goal_completed', name: 'First Goal Completed', description: 'Complete 1 goal', target: 1, progress: (s) => s.completedGoals },
]

export function evaluateAchievements(s: AchievementStats): { ruleKey: string; name: string; unlocked: boolean; progress: number; target: number }[] {
  return ACHIEVEMENT_DEFS.map((d) => {
    const progress = Math.min(d.target, d.progress(s))
    return { ruleKey: d.ruleKey, name: d.name, unlocked: progress >= d.target, progress, target: d.target }
  })
}
