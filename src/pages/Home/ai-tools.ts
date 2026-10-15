/**
 * Function calling interface for AI to create habits and quests.
 */

import { createHabit, createQuest } from '../../data/write'
import type { Attribute } from '../../core/db/types'

export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

export interface ToolResult {
  success: boolean
  message: string
  id?: number
}

/**
 * Execute a tool call from the AI.
 */
export async function executeTool(call: ToolCall): Promise<ToolResult> {
  try {
    switch (call.name) {
      case 'create_habit': {
        const { name, frequency, category, difficulty, impact, attributes } = call.args
        if (!name || typeof name !== 'string') throw new Error('Missing habit name')
        const id = await createHabit({
          name: name,
          frequency: (frequency as 'daily' | 'weekly') || 'daily',
          category: (category as string) || 'general',
          difficulty: Number(difficulty) || 1,
          impact: Number(impact) || 1,
          attributes: (attributes as Attribute[]) || [],
        })
        return { success: true, message: `Created habit: ${name}`, id }
      }

      case 'create_task': {
        const { title, description, type, category, difficulty, effort, impact, attributes, deadline } = call.args
        if (!title || typeof title !== 'string') throw new Error('Missing task title')
        const id = await createQuest({
          title: title,
          description: (description as string) || '',
          type: (type as 'main' | 'side' | 'challenge' | 'recovery') || 'side',
          category: (category as string) || 'general',
          difficulty: Number(difficulty) || 1,
          effort: Number(effort) || 1,
          impact: Number(impact) || 1,
          attributes: (attributes as Attribute[]) || [],
          deadline: deadline as string | undefined,
        })
        return { success: true, message: `Created task: ${title}`, id }
      }

      default:
        return { success: false, message: `Unknown tool: ${call.name}` }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Tool execution failed' }
  }
}

/**
 * Available tools for the AI to call.
 */
export const AI_TOOLS = [
  {
    name: 'create_habit',
    description: 'Create a new daily or weekly habit',
    parameters: {
      name: { type: 'string', required: true, description: 'Habit name' },
      frequency: { type: 'string', required: false, description: 'daily or weekly (default: daily)' },
      category: { type: 'string', required: false, description: 'Category (default: general)' },
      difficulty: { type: 'number', required: false, description: '1-5 (default: 1)' },
      impact: { type: 'number', required: false, description: '1-5 (default: 1)' },
      attributes: { type: 'array', required: false, description: 'Skills to level up (e.g. ["strength", "wisdom"])' },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task or quest',
    parameters: {
      title: { type: 'string', required: true, description: 'Task title' },
      description: { type: 'string', required: false, description: 'Task details' },
      type: { type: 'string', required: false, description: 'main, side, challenge, or recovery (default: side)' },
      category: { type: 'string', required: false, description: 'Category (default: general)' },
      difficulty: { type: 'number', required: false, description: '1-5 (default: 1)' },
      effort: { type: 'number', required: false, description: '1-5 (default: 1)' },
      impact: { type: 'number', required: false, description: '1-5 (default: 1)' },
      attributes: { type: 'array', required: false, description: 'Skills to level up' },
      deadline: { type: 'string', required: false, description: 'Due date (YYYY-MM-DD)' },
    },
  },
]

/**
 * Parse tool calls from AI response text.
 * Looks for patterns like: [TOOL:create_habit|name=Morning walk|frequency=daily]
 */
export function parseToolCalls(text: string): { cleanText: string; calls: ToolCall[] } {
  const calls: ToolCall[] = []
  const pattern = /\[TOOL:([^\]|]+)(?:\|([^\]]+))?\]/g
  
  const cleanText = text.replace(pattern, (_fullMatch, toolName, argsStr) => {
    const args: Record<string, unknown> = {}
    if (argsStr) {
      const pairs = argsStr.split('|')
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim()
          // Try to parse as JSON array for attributes
          if (key === 'attributes' && value.startsWith('[')) {
            try {
              args[key] = JSON.parse(value)
            } catch {
              args[key] = []
            }
          } else {
            args[key] = value
          }
        }
      }
    }
    calls.push({ name: toolName, args })
    return '' // Remove tool call from text
  })

  return { cleanText: cleanText.trim(), calls }
}
