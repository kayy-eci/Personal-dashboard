/**
 * Chat tool contract after RPG removal (§4.5, §11): neutral task/habit
 * tools, no RPG parameters, removed tools refused with a clear message,
 * old tool-call records never executed.
 *
 * RED in Phase 1: tools still accept RPG params and store RPG fields;
 * the refusal message is generic.
 */
import { describe, expect, it, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { LifeOSDb, setDbForTests } from '../../src/core/db/db'
import { createProfile } from '../../src/core/repo/profile'
import { AI_TOOLS, executeTool } from '../../src/pages/Home/ai-tools'

let db: LifeOSDb

beforeEach(async () => {
  db = new LifeOSDb(`chat-${Math.random().toString(36).slice(2)}`)
  setDbForTests(db)
  const { seedDatabase } = await import('../../src/core/db/db')
  await seedDatabase(db)
  await createProfile('Tester')
})

async function cleanup() {
  setDbForTests(null as never)
  await db.close()
  await Dexie.delete(db.name)
}

describe('renamed chat tools', () => {
  it('create_task stores a neutral task and ignores RPG arguments', async () => {
    const result = await executeTool({
      name: 'create_task',
      args: { title: 'Buy milk', category: 'errands', difficulty: 5, type: 'main', attributes: ['STR'] },
    })
    expect(result.success).toBe(true)
    const row = (await db.table('tasks').get(result.id!)) as unknown as Record<string, unknown>
    expect(row.title).toBe('Buy milk')
    for (const dropped of ['type', 'difficulty', 'effort', 'impact', 'baseXp', 'attributes']) {
      expect(row, `task must not have ${dropped}`).not.toHaveProperty(dropped)
    }
    await cleanup()
  })

  it('create_habit stores a neutral habit and ignores RPG arguments', async () => {
    const result = await executeTool({
      name: 'create_habit',
      args: { name: 'Read', frequency: 'daily', difficulty: 4, impact: 5, attributes: ['INT'] },
    })
    expect(result.success).toBe(true)
    const row = (await db.habits.get(result.id!)) as unknown as Record<string, unknown>
    for (const dropped of ['difficulty', 'impact', 'attributes']) {
      expect(row, `habit must not have ${dropped}`).not.toHaveProperty(dropped)
    }
    await cleanup()
  })

  it('tool declarations expose no RPG parameters', () => {
    const text = JSON.stringify(AI_TOOLS).toLowerCase()
    for (const banned of ['difficulty', 'effort', 'impact', 'attribute', 'level up', 'recovery', 'quest', 'xp', 'vitality', 'health']) {
      expect(text, `tool declarations must not mention ${banned}`).not.toContain(banned)
    }
    expect(AI_TOOLS.map((t) => t.name)).toContain('create_task')
  })
})

describe('removed chat tools', () => {
  it.each(['create_quest', 'get_player_stats', 'claim_recovery', 'complete_quest'])(
    'old tool %s is refused with a clear message and writes nothing',
    async (name) => {
      const before = await db.table('tasks').count().catch(() => 0)
      const result = await executeTool({ name, args: { title: 'Nope' } })
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/no longer available/i)
      expect(await db.habits.count()).toBe(0)
      expect(await db.table('tasks').count().catch(() => 0)).toBe(before)
      await cleanup()
    },
  )
})
