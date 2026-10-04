import { runDailyCheck } from '../services/vitality'
import { nextMidnightPlusOne } from '../domain/time'

let lastRunAt = 0

async function guardedCheck(): Promise<void> {
  const run = () => runDailyCheck(new Date())
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    try {
      await navigator.locks.request('lifeos-daily-check', () => run().then(() => undefined))
      return
    } catch {
      // fall through
    }
  }
  await run()
}

export function installDailyCheckTriggers(): void {
  void guardedCheck()
  lastRunAt = Date.now()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastRunAt > 3600_000) {
      lastRunAt = Date.now()
      void guardedCheck()
    }
  })

  const scheduleMidnight = () => {
    const ms = nextMidnightPlusOne(new Date()).getTime() - Date.now()
    setTimeout(() => {
      lastRunAt = Date.now()
      void guardedCheck().finally(scheduleMidnight)
    }, ms)
  }
  scheduleMidnight()
}
