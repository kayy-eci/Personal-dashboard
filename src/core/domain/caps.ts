import type { Attribute, XpBreakdown } from './xp'

/** Per-attribute daily soft cap: XP beyond this is halved. */
export const ATTRIBUTE_DAILY_CAP = 150
export const ATTRIBUTE_CAP_MULT = 0.5
export const TRIVIAL_FULL_PER_DAY = 3
export const TRIVIAL_MULT = 0.5

function roundHalfUp(n: number): number {
  return Math.floor(n + 0.5)
}

/**
 * Apply the per-attribute soft cap. `todayAttributeXp` is the attribute's XP
 * already earned today (ledger sum). Applies per target attribute after split.
 */
export function applyAttributeCap(
  base: number,
  todayAttributeXp: number,
): { final: number; cap: XpBreakdown['cap'] } {
  if (todayAttributeXp >= ATTRIBUTE_DAILY_CAP) {
    return { final: Math.max(1, roundHalfUp(base * ATTRIBUTE_CAP_MULT)), cap: { rule: 'attribute_daily_soft_cap', multiplier: ATTRIBUTE_CAP_MULT } }
  }
  if (todayAttributeXp + base > ATTRIBUTE_DAILY_CAP) {
    const uncapped = ATTRIBUTE_DAILY_CAP - todayAttributeXp
    const overflow = base - uncapped
    const final = Math.max(1, uncapped + roundHalfUp(overflow * ATTRIBUTE_CAP_MULT))
    return { final, cap: { rule: 'attribute_daily_soft_cap', multiplier: ATTRIBUTE_CAP_MULT } }
  }
  return { final: base, cap: null }
}

/** Trivial quests (difficulty 1 and effort 1): first 3 per day full, then halved. */
export function applyTrivialCap(
  base: number,
  trivialQuestsToday: number,
): { final: number; cap: XpBreakdown['cap'] } {
  if (trivialQuestsToday >= TRIVIAL_FULL_PER_DAY) {
    return { final: Math.max(1, roundHalfUp(base * TRIVIAL_MULT)), cap: { rule: 'trivial_quest_daily_limit', multiplier: TRIVIAL_MULT } }
  }
  return { final: base, cap: null }
}

export function withCap(breakdown: XpBreakdown, final: number, cap: XpBreakdown['cap'], attribute?: Attribute): XpBreakdown {
  return { ...breakdown, final, cap: cap ? { ...cap, attribute } : null }
}
