import { getDb } from '../core/db/db'
import type { ChatSession } from '../core/db/types'

function now(): string {
  return new Date().toISOString()
}

export async function createChatSession(): Promise<number> {
  const db = getDb()
  return (await db.chats.add({
    title: 'New chat',
    messages: [],
    createdAt: now(),
    updatedAt: now(),
  })) as number
}

export async function addChatMessage(sessionId: number, role: 'user' | 'assistant', text: string): Promise<void> {
  const db = getDb()
  const session = await db.chats.get(sessionId)
  if (!session) return
  const updated = {
    ...session,
    messages: [...session.messages, { role, text, createdAt: now() }],
    updatedAt: now(),
  }
  // auto title from first user message
  if (session.title === 'New chat' && role === 'user') {
    updated.title = text.slice(0, 40) || 'New chat'
  }
  await db.chats.update(sessionId, updated)
}

export async function loadChatSessions(): Promise<ChatSession[]> {
  const db = getDb()
  const rows = await db.chats.orderBy('updatedAt').reverse().toArray()
  return rows
}

export async function getChatSession(id: number): Promise<ChatSession | undefined> {
  const db = getDb()
  return db.chats.get(id)
}

export async function deleteChatSession(id: number): Promise<void> {
  const db = getDb()
  await db.chats.delete(id)
}

export async function updateChatTitle(id: number, title: string): Promise<void> {
  const db = getDb()
  await db.chats.update(id, { title, updatedAt: now() })
}
