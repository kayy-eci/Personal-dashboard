import type { ActivityDay } from './github-activity-grid'

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function mockActivityYear(seed = 42, endDate: Date = new Date()): ActivityDay[] {
  const total = 371
  const days: ActivityDay[] = []
  let state = seed
  const random = () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  for (let index = total - 1; index >= 0; index--) {
    const date = new Date(end)
    date.setDate(end.getDate() - index)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const roll = random()
    let count = 0
    if (roll >= 0.35 && roll < 0.6) count = Math.floor(random() * 3) + 1
    else if (roll >= 0.6 && roll < 0.85) count = Math.floor(random() * 6) + 3
    else if (roll >= 0.85) count = Math.floor(random() * 10) + 8
    if (random() > (weekend ? 0.18 : 0.55)) count = Math.max(0, count - 2)
    days.push({ date: dateKey(date), count })
  }
  return days
}
