import { useMemo } from 'react'

interface ActivityDay {
  date: string
  count: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getActivityCount(seed: number, dayIndex: number, date: Date) {
  const value = Math.sin(seed * 12.9898 + dayIndex * 78.233) * 43758.5453
  const random = value - Math.floor(value)
  const weekend = date.getDay() === 0 || date.getDay() === 6

  if (random < (weekend ? 0.52 : 0.32)) return 0
  return 1 + Math.floor(random * 8)
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ActivityGrid({ seed }: { seed: number }) {
  const { weeks, monthLabels, total, maxCount } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 52 * 7)

    const days: ActivityDay[] = Array.from({ length: 53 * 7 }, (_, index) => {
      const date = new Date(start.getTime() + index * DAY_MS)
      return {
        date: toDateKey(date),
        count: date <= today ? getActivityCount(seed, index, date) : 0,
      }
    })
    const weeks = Array.from({ length: 53 }, (_, index) => days.slice(index * 7, index * 7 + 7))
    const monthLabels = weeks.flatMap((week, index) => {
      const firstDay = new Date(`${week[0].date}T12:00:00`)
      if (index === 0 || firstDay.getDate() <= 7) {
        return [{ index, label: firstDay.toLocaleDateString(undefined, { month: 'short' }) }]
      }
      return []
    })

    return {
      weeks,
      monthLabels,
      total: days.reduce((sum, day) => sum + day.count, 0),
      maxCount: Math.max(1, ...days.map((day) => day.count)),
    }
  }, [seed])

  return (
    <section className="activity-grid" aria-label="Activity over the last year">
      <div className="activity-grid__header">
        <p>
          <strong>{total.toLocaleString()}</strong> activities in the last year
        </p>
        <div className="activity-grid__legend" aria-label="Activity level: less to more">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              className={`activity-grid__cell activity-grid__cell--level-${level}`}
              key={level}
              aria-hidden="true"
            />
          ))}
          <span>More</span>
        </div>
      </div>
      <p className="activity-grid__caption">Illustrative sample activity, not connected to GitHub.</p>

      <div className="activity-grid__viewport">
        <div className="activity-grid__month-labels" aria-hidden="true">
          {monthLabels.map((month) => (
            <span
              key={`${month.index}-${month.label}`}
              style={{ gridColumn: month.index + 1 }}
            >
              {month.label}
            </span>
          ))}
        </div>
        <div className="activity-grid__body">
          <div className="activity-grid__weekdays" aria-hidden="true">
            {WEEKDAYS.map((day, index) => <span key={index}>{day}</span>)}
          </div>
          <div className="activity-grid__weeks">
            {weeks.map((week) => (
              <div className="activity-grid__week" key={week[0].date}>
                {week.map((day) => {
                  const level = day.count === 0 ? 0 : Math.min(4, Math.ceil((day.count / maxCount) * 4))
                  return (
                    <button
                      className={`activity-grid__cell activity-grid__cell--level-${level}`}
                      type="button"
                      key={day.date}
                      aria-label={`${day.count} ${day.count === 1 ? 'activity' : 'activities'} on ${formatDate(day.date)}`}
                      title={`${day.count} ${day.count === 1 ? 'activity' : 'activities'} on ${formatDate(day.date)}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
