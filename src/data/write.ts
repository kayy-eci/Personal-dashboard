import { getDb } from '../core/db/db'
import { localDate } from '../core/domain/time'
import type { Attribute } from '../core/db/types'

function now(): string {
  return new Date().toISOString()
}

export async function createHabit(input: { name: string; frequency: 'daily' | 'weekly'; category: string; difficulty: number; impact: number; attributes: Attribute[]; goalId?: number }): Promise<number> {
  const db = getDb()
  return (await db.habits.add({ ...input, archived: false, createdAt: now(), createdLocalDate: localDate(new Date()) })) as number
}

export async function updateHabit(id: number, patch: Partial<{ name: string; category: string; difficulty: number; impact: number; attributes: Attribute[]; goalId: number }>): Promise<void> {
  await getDb().habits.update(id, patch)
}

export async function archiveHabit(id: number): Promise<void> {
  await getDb().habits.update(id, { archived: true })
}

export async function unarchiveHabit(id: number): Promise<void> {
  await getDb().habits.update(id, { archived: false })
}

export async function createQuest(input: { title: string; description?: string; type: 'main' | 'side' | 'challenge' | 'recovery'; category: string; difficulty: number; effort: number; impact: number; baseXp?: number; attributes: Attribute[]; scheduledDate?: string; deadline?: string; goalId?: number; milestoneId?: number }): Promise<number> {
  const db = getDb()
  return (await db.quests.add({ ...input, description: input.description ?? '', status: 'active', createdAt: now(), createdLocalDate: localDate(new Date()) })) as number
}

export async function updateQuest(id: number, patch: Partial<{ title: string; description: string; scheduledDate: string; deadline: string; type: 'main' | 'side' | 'challenge' | 'recovery'; category: string; difficulty: number; effort: number; impact: number; attributes: Attribute[]; goalId: number }>): Promise<void> {
  await getDb().quests.update(id, patch)
}

export async function archiveQuest(id: number): Promise<void> {
  await getDb().quests.update(id, { status: 'archived' })
}

export async function deleteQuest(id: number): Promise<void> {
  const q = await getDb().quests.get(id)
  if (q && q.status === 'completed') throw new Error('ALREADY_COMPLETED: completed quests are archived, not deleted')
  await getDb().quests.delete(id)
}

export async function createGoal(input: { title: string; description?: string; category: string; attribute?: Attribute; deadline?: string }): Promise<number> {
  const db = getDb()
  return (await db.goals.add({ ...input, description: input.description ?? '', status: 'active', createdAt: now() })) as number
}

export async function updateGoal(id: number, patch: Partial<{ title: string; description: string; category: string; attribute: Attribute; deadline: string; status: 'active' | 'completed' | 'archived' }>): Promise<void> {
  await getDb().goals.update(id, patch)
}

export async function archiveGoal(id: number): Promise<void> {
  const db = getDb()
  await db.goals.update(id, { status: 'archived' })
}

export async function addMilestone(goalId: number, title: string): Promise<number> {
  const db = getDb()
  const existing = await db.milestones.where('goalId').equals(goalId).toArray()
  return (await db.milestones.add({ goalId, title, orderIndex: existing.length, status: 'pending' })) as number
}

export async function completeMilestoneAction(id: number) {
  const { completeMilestone } = await import('../core/services/completion')
  return completeMilestone(id)
}

export async function reorderMilestones(goalId: number, orderedIds: number[]): Promise<void> {
  const db = getDb()
  await db.transaction('rw', [db.milestones], async () => {
    const owned = await db.milestones.where('goalId').equals(goalId).toArray()
    if (owned.length !== orderedIds.length) throw new Error('VALIDATION: reorder must include every milestone of the goal')
    for (let i = 0; i < orderedIds.length; i++) await db.milestones.update(orderedIds[i], { orderIndex: i })
  })
}

export async function deleteMilestone(id: number): Promise<void> {
  const m = await getDb().milestones.get(id)
  if (!m || m.status !== 'pending') throw new Error('VALIDATION: only pending milestones can be deleted')
  await getDb().milestones.delete(id)
}

export async function linkToGoal(kind: 'habit' | 'quest', id: number, goalId: number): Promise<void> {
  const db = getDb()
  if (kind === 'habit') await db.habits.update(id, { goalId })
  else await db.quests.update(id, { goalId })
}

export async function uncheckHabitToday(habitId: number, date?: string): Promise<void> {
  const db = getDb()
  const d = date ?? localDate(new Date())
  await db.habitLogs.where('[habitId+logDate]').equals([habitId, d]).delete()
}

export async function unlinkFromGoal(kind: 'habit' | 'quest', id: number): Promise<void> {
  const db = getDb()
  if (kind === 'habit') await db.habits.update(id, { goalId: undefined })
  else await db.quests.update(id, { goalId: undefined })
}
