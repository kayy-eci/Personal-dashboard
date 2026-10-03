export interface HealthSettings {
  max: number
  lossPerMissedHabit: number
  lossPerMissedQuest: number
  recoveryAmount: number
  recoveryDailyLimit: number
}

export interface DailyVitalityResult {
  missedHabits: number
  scheduledHabits: number
  missedQuests: number
  totalLoss: number
}

export function computeDailyVitalityLoss(
  scheduledDailyCount: number,
  doneDailyCount: number,
  missedQuestCount: number,
  s: HealthSettings,
): DailyVitalityResult {
  const missedHabits = Math.max(0, scheduledDailyCount - doneDailyCount)
  const loss = missedHabits * s.lossPerMissedHabit + missedQuestCount * s.lossPerMissedQuest
  return { missedHabits, scheduledHabits: scheduledDailyCount, missedQuests: missedQuestCount, totalLoss: loss }
}

export function clampHealth(hp: number, max: number): number {
  return Math.min(max, Math.max(0, hp))
}

export function recoveryGain(currentHealth: number, maxHealth: number, recoveryAmount: number): number {
  return clampHealth(currentHealth + recoveryAmount, maxHealth) - currentHealth
}
