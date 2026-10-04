import { useEffect, useState } from 'react'
import App from './App'
import { getDb, seedDatabase } from './core/db/db'
import { installDailyCheckTriggers } from './core/platform/dailyCheck'
import { getProfile } from './data'
import { FirstRun } from './pages/FirstRun/FirstRun'

function requestPersistence() {
  try {
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      void navigator.storage.persisted().then((persisted) => {
        if (!persisted) void navigator.storage.persist().catch(() => undefined)
      })
    }
  } catch {
    // ignore
  }
}

export function Root() {
  const [state, setState] = useState<'loading' | 'setup' | 'app'>('loading')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const db = getDb()
        await db.open()
        await seedDatabase(db)
        requestPersistence()
        installDailyCheckTriggers()
        const profile = await getProfile()
        if (!cancelled) setState(profile ? 'app' : 'setup')
      } catch (err) {
        console.error(err)
        if (!cancelled) setState('setup')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading') return null
  if (state === 'setup') return <FirstRun onDone={() => setState('app')} />
  return <App />
}
