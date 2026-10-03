export type Attribute = 'STR' | 'INT' | 'DISC' | 'CREAT' | 'FOCUS' | 'SOC'

export const ATTRIBUTES: Attribute[] = ['STR', 'INT', 'DISC', 'CREAT', 'FOCUS', 'SOC']

export interface XpBreakdown {
  base: number
  difficulty: { rating: number; multiplier: number }
  effort: { rating: number; multiplier: number }
  impact: { rating: number; multiplier: number }
  consistency: { streakDays: number; multiplier: number }
  raw: number
  cap: null | { rule: string; attribute?: Attribute; multiplier: number }
  final: number
  formulaVersion: number
}

export const FORMULA_VERSION = 1

const DIFFICULTY_MULT = [0.8, 1.0, 1.25, 1.5, 2.0]
const EFFORT_MULT = [0.8, 0.9, 1.0, 1.2, 1.4]
const IMPACT_MULT = [0.9, 1.0, 1.05, 1.1, 1.25]

/** 1-based rating (1..5) -> multiplier. */
export function ratingMultiplier(kind: 'difficulty' | 'effort' | 'impact', rating: number): number {
  const t = kind === 'difficulty' ? DIFFICULTY_MULT : kind === 'effort' ? EFFORT_MULT : IMPACT_MULT
  const idx = Math.min(4, Math.max(0, Math.round(rating) - 1))
  return t[idx]
}

export interface XpInput {
  base: number
  difficulty?: number // rating 1..5; omit for no difficulty scaling
  effort?: number
  impact?: number
  consistencyMultiplier?: number
  consistencyStreakDays?: number
}

function roundHalfUp(n: number): number {
  return Math.floor(n + 0.5)
}

export function computeXp(input: XpInput): XpBreakdown {
  const d = input.difficulty !== undefined ? ratingMultiplier('difficulty', input.difficulty) : 1
  const e = input.effort !== undefined ? ratingMultiplier('effort', input.effort) : 1
  const i = input.impact !== undefined ? ratingMultiplier('impact', input.impact) : 1
  const c = input.consistencyMultiplier ?? 1
  const raw = input.base * d * e * i * c
  const final = Math.max(1, roundHalfUp(raw))
  return {
    base: input.base,
    difficulty: { rating: input.difficulty ?? 0, multiplier: d },
    effort: { rating: input.effort ?? 0, multiplier: e },
    impact: { rating: input.impact ?? 0, multiplier: i },
    consistency: { streakDays: input.consistencyStreakDays ?? 0, multiplier: c },
    raw: Math.round(raw * 1000) / 1000,
    cap: null,
    final,
    formulaVersion: FORMULA_VERSION,
  }
}

export function habitBaseXp(): number {
  return 15
}

export function questBaseXp(type: 'main' | 'side' | 'challenge' | 'recovery', baseXp?: number): number {
  if (baseXp && baseXp > 0) return baseXp
  return type === 'main' ? 60 : type === 'side' ? 30 : type === 'challenge' ? 40 : 10
}

export function milestoneBaseXp(): number {
  return 150
}

export function goalBonusBaseXp(): number {
  return 300
}

/** Consistency multiplier from the habit's streak before this check-in. */
export function consistencyMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 1.2
  if (streakDays >= 14) return 1.15
  if (streakDays >= 7) return 1.1
  if (streakDays >= 3) return 1.05
  return 1.0
}
