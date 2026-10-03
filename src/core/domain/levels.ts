export const PLAYER_LEVEL_CAP = 100
export const ATTRIBUTE_LEVEL_CAP = 100

export function playerXpForNext(level: number): number {
  return 120 + 10 * level
}

export function attributeXpForNext(level: number): number {
  return 60 + 15 * level
}

export function levelFromTotalXp(total: number, player = true): number {
  const cap = player ? PLAYER_LEVEL_CAP : ATTRIBUTE_LEVEL_CAP
  let level = 1
  let remaining = total
  for (;;) {
    if (level >= cap) return cap
    const need = player ? playerXpForNext(level) : attributeXpForNext(level)
    if (remaining < need) return level
    remaining -= need
    level += 1
  }
}

export function progressInLevel(total: number): { level: number; xpIntoLevel: number; xpForNext: number; percent: number } {
  const level = levelFromTotalXp(total, true)
  let consumed = 0
  for (let l = 1; l < level; l++) consumed += playerXpForNext(l)
  const xpIntoLevel = total - consumed
  const xpForNext = playerXpForNext(level)
  return { level, xpIntoLevel, xpForNext, percent: Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100)) }
}

/** Level changes between two totals, inclusive of multi-level jumps. */
export function detectLevelUps(prevTotal: number, newTotal: number): { from: number; to: number } | null {
  const from = levelFromTotalXp(prevTotal, true)
  const to = levelFromTotalXp(newTotal, true)
  return to > from ? { from, to } : null
}

export function detectAttributeLevelUps(prev: number, next: number): { from: number; to: number } | null {
  const from = levelFromTotalXp(prev, false)
  const to = levelFromTotalXp(next, false)
  return to > from ? { from, to } : null
}
