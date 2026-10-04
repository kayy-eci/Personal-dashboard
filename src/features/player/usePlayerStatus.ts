import { useEffect, useState } from 'react'
import { subscribe } from '../../data'
import { getPlayerStatus } from '../../data'
import type { PlayerStatus } from './types'

const EMPTY: PlayerStatus = {
  level: 1,
  totalXp: 0,
  xpIntoLevel: 0,
  xpForNextLevel: 130,
  health: 100,
  maxHealth: 100,
  currentStreak: 0,
  attributes: [
    { key: 'STR', label: 'Strength', level: 1, xp: 0, xpToNextLevel: 75 },
    { key: 'INT', label: 'Intellect', level: 1, xp: 0, xpToNextLevel: 75 },
    { key: 'DISC', label: 'Discipline', level: 1, xp: 0, xpToNextLevel: 75 },
    { key: 'CREAT', label: 'Creativity', level: 1, xp: 0, xpToNextLevel: 75 },
    { key: 'FOCUS', label: 'Focus', level: 1, xp: 0, xpToNextLevel: 75 },
    { key: 'SOC', label: 'Social', level: 1, xp: 0, xpToNextLevel: 75 },
  ],
  recentHealthLog: [],
}

export function usePlayerStatus(): PlayerStatus {
  const [status, setStatus] = useState<PlayerStatus>(EMPTY)
  useEffect(() => {
    let cancelled = false
    const load = () =>
      getPlayerStatus().then((s) => {
        if (!cancelled && s) setStatus(s)
      })
    void load()
    const unsub = subscribe('data', load)
    return () => {
      cancelled = true
      unsub()
    }
  }, [])
  return status
}
