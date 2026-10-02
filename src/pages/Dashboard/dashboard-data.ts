export interface HabitItem {
  id: string
  name: string
  attributes: string[]
  difficulty: 'Easy' | 'Med' | 'Hard'
  streak: number
  consistency: number | null
  reward: number
  rewardType: 'XP' | 'HP'
  recovery?: boolean
  initialDone: boolean
}

export interface QuestItem {
  id: string
  category: 'main' | 'side' | 'challenge' | 'recovery'
  linkedGoal?: string
  deadline?: string
  title: string
  description: string
  baseReward?: number
  difficulty?: number
  effort?: number
  impact?: number
  reward: number
  rewardType: 'XP' | 'HP'
  attributeRewards: string[]
}

export interface ActivityEntry {
  id: string
  time: string
  title: string
  reward: string
  detail: string
  tone: 'xp' | 'health'
}

export const initialHabits: HabitItem[] = [
  {
    id: 'deep-work',
    name: 'Morning Deep Work (90m)',
    attributes: ['FOCUS', 'INT'],
    difficulty: 'Hard',
    streak: 14,
    consistency: 92,
    reward: 45,
    rewardType: 'XP',
    initialDone: true,
  },
  {
    id: 'strength',
    name: 'Compound Strength Workout',
    attributes: ['STR', 'DISC'],
    difficulty: 'Med',
    streak: 4,
    consistency: 85,
    reward: 60,
    rewardType: 'XP',
    initialDone: false,
  },
  {
    id: 'reading',
    name: 'Read 20 pages Technical Book',
    attributes: ['INT', 'FOCUS'],
    difficulty: 'Easy',
    streak: 8,
    consistency: 90,
    reward: 30,
    rewardType: 'XP',
    initialDone: false,
  },
  {
    id: 'meditation',
    name: 'Mindful Meditation & Mobility',
    attributes: ['Health Recovery'],
    difficulty: 'Easy',
    streak: 12,
    consistency: null,
    reward: 15,
    rewardType: 'HP',
    recovery: true,
    initialDone: false,
  },
]

export const initialRecoveryQuest: QuestItem = {
  id: 'nature-walk',
  category: 'recovery',
  title: 'Unplugged Nature Walk (45m)',
  description:
    'Zero screens, daylight exposure, active parasympathetic neural restoration.',
  reward: 20,
  rewardType: 'HP',
  attributeRewards: [],
}

export const initialQuests: QuestItem[] = [
  {
    id: 'xp-ledger',
    category: 'main',
    linkedGoal: 'Ship LifeOS Alpha',
    deadline: 'Today 18:00',
    title: 'Implement Append-Only XP Ledger Module',
    description:
      'Persist calculations with formula versioning to guarantee non-rewritable stat consistency.',
    baseReward: 100,
    difficulty: 1.5,
    effort: 1.2,
    impact: 1,
    reward: 180,
    rewardType: 'XP',
    attributeRewards: ['INT +120', 'FOCUS +60'],
  },
  {
    id: 'database-iops',
    category: 'side',
    linkedGoal: 'Master System Architecture',
    deadline: '2d remaining',
    title: 'Benchmark Database IOPS for SQLite Ledger',
    description:
      'Execute synthetic stress loads on 10,000 append events to measure latency bottlenecks.',
    baseReward: 50,
    difficulty: 1.5,
    effort: 1.2,
    impact: 1,
    reward: 90,
    rewardType: 'XP',
    attributeRewards: ['INT +90'],
  },
  {
    id: 'architecture-challenge',
    category: 'challenge',
    linkedGoal: 'Master System Architecture',
    deadline: 'This week',
    title: 'Map the System Data Flow',
    description: 'Document how checked activities shape player stats and long-term progress.',
    baseReward: 50,
    difficulty: 2,
    effort: 1.5,
    impact: 1.2,
    reward: 180,
    rewardType: 'XP',
    attributeRewards: ['INT +120', 'CREAT +60'],
  },
  initialRecoveryQuest,
]

export const initialActivity: ActivityEntry[] = [
  {
    id: 'architecture',
    time: '14:20 TODAY',
    title: 'Completed Quest: "Draft System Architecture"',
    reward: '+180 XP',
    detail: 'XP: Base 100 × Diff 1.5 × Impact 1.2 · (INT +120, FOCUS +60)',
    tone: 'xp',
  },
  {
    id: 'morning-work',
    time: '09:15 TODAY',
    title: 'Habit: "Morning Deep Work" Checked',
    reward: '+45 XP',
    detail: 'Streak: 14 Days · FOCUS +45 · Consistency 92%',
    tone: 'xp',
  },
  {
    id: 'day-end',
    time: 'YESTERDAY 23:59',
    title: 'Automated Day-End Cycle Check',
    reward: '-5 HP',
    detail: 'One scheduled routine was missed. A neutral penalty was applied.',
    tone: 'health',
  },
]

export const initialGoals = [
  {
    title: 'Ship LifeOS v1.0 MVP',
    target: 'Target: Oct 30 · 3/5 Milestones',
    progress: 68,
    tone: 'violet',
  },
  {
    title: '15% Body Fat & 100kg Bench',
    target: 'Target: Dec 15 · 2/4 Milestones',
    progress: 55,
    tone: 'rose',
  },
  {
    title: 'Master System Architecture',
    target: 'Target: Continuous · 4/5 Milestones',
    progress: 80,
    tone: 'sky',
  },
] as const
