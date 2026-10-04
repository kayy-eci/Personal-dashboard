import { getDb } from '../db/db'
import type { Profile } from '../db/types'
import { localDate } from '../domain/time'

export async function getProfile(): Promise<Profile | undefined> {
  return getDb().profile.get(1)
}

export function requireProfile(): Promise<Profile> {
  return getDb().profile.get(1).then((p) => {
    if (!p) throw new Error('PROFILE_MISSING')
    return p
  })
}

export async function createProfile(name: string, avatar?: string): Promise<Profile> {
  const db = getDb()
  const existing = await db.profile.get(1)
  if (existing) throw new Error('PROFILE_EXISTS')
  const now = new Date()
  const profile: Profile = {
    id: 1,
    name: name.trim(),
    avatar,
    level: 1,
    totalXp: 0,
    health: 100,
    maxHealth: 100,
    currentStreak: 0,
    bestStreak: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  const today = localDate(now)
  await db.transaction('rw', [db.profile, db.timelineEvents, db.settings], async () => {
    await db.profile.put(profile)
    await db.timelineEvents.add({ eventType: 'profile_created', title: `Welcome, ${profile.name}`, note: '', localDate: today, createdAt: now.toISOString() })
    await db.settings.put({ key: 'health.lastCheckedDate', value: new Date(now.getTime() - 86400000).toISOString().slice(0, 10), updatedAt: now.toISOString() })
    await db.settings.put({ key: 'app.firstRunDate', value: today, updatedAt: now.toISOString() })
    await db.settings.put({ key: 'health.max', value: 100, updatedAt: now.toISOString() })
  })
  return profile
}
