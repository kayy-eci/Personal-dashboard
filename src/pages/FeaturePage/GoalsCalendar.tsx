import { useMemo, useState } from 'react'

export interface GoalCalendarEvent {
  id: string
  date: string
  goalTitle: string
  title: string
  type: 'goal' | 'milestone'
}

interface GoalsCalendarProps {
  events: GoalCalendarEvent[]
}

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function GoalsCalendar({ events }: GoalsCalendarProps) {
  const today = new Date()
  const todayKey = dateKey(today)
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState(todayKey)

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth(),
      1,
    )
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        displayedMonth.getFullYear(),
        displayedMonth.getMonth(),
        index - mondayOffset + 1,
      )
      return { date, key: dateKey(date) }
    })
  }, [displayedMonth])
  const calendarWeeks = Array.from({ length: 6 }, (_, weekIndex) =>
    calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7),
  )

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, GoalCalendarEvent[]>()
    for (const event of events) {
      if (!event.date) continue
      const dayEvents = grouped.get(event.date) ?? []
      dayEvents.push(event)
      grouped.set(event.date, dayEvents)
    }
    return grouped
  }, [events])

  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const selectedDateLabel = formatDate(new Date(`${selectedDate}T12:00:00`))
  const monthLabel = displayedMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const shiftMonth = (amount: number) => {
    setDisplayedMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + amount, 1),
    )
  }

  const showToday = () => {
    setDisplayedMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(todayKey)
  }

  return (
    <section className="goals-calendar" aria-label="Goal and milestone calendar">
      <header className="goals-calendar__header">
        <div>
          <h3>{monthLabel}</h3>
          <p>Due dates for goals and their milestones</p>
        </div>
        <div className="goals-calendar__controls" aria-label="Calendar navigation">
          <button
            type="button"
            className="feature-button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            &larr;
          </button>
          <button type="button" className="feature-button" onClick={showToday}>
            Today
          </button>
          <button
            type="button"
            className="feature-button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            &rarr;
          </button>
        </div>
      </header>

      <div className="goals-calendar__grid" role="grid" aria-label={monthLabel}>
        <div className="goals-calendar__week" role="row">
          {weekDays.map((day) => (
            <div className="goals-calendar__weekday" role="columnheader" key={day}>
              {day}
            </div>
          ))}
        </div>
        {calendarWeeks.map((week, index) => (
          <div className="goals-calendar__week" role="row" key={index}>
            {week.map(({ date, key }) => {
              const dayEvents = eventsByDate.get(key) ?? []
              const isCurrentMonth = date.getMonth() === displayedMonth.getMonth()
              const isSelected = key === selectedDate
              const isToday = key === todayKey
              return (
                <div className="goals-calendar__cell" role="gridcell" key={key}>
                  <button
                    className={[
                      'goals-calendar__day',
                      !isCurrentMonth && 'goals-calendar__day--outside',
                      isSelected && 'goals-calendar__day--selected',
                      isToday && 'goals-calendar__day--today',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    type="button"
                    aria-label={`${formatDate(date)}${dayEvents.length ? `, ${dayEvents.length} scheduled ${dayEvents.length === 1 ? 'item' : 'items'}` : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDate(key)}
                  >
                    <span className="goals-calendar__date">{date.getDate()}</span>
                    <span className="goals-calendar__events" aria-hidden="true">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          className={`goals-calendar__event goals-calendar__event--${event.type}`}
                          key={event.id}
                        >
                          {event.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="goals-calendar__more">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="goals-calendar__agenda" aria-live="polite">
        <h4>{selectedDateLabel}</h4>
        {selectedEvents.length ? (
          <ul>
            {selectedEvents.map((event) => (
              <li key={event.id}>
                <span
                  className={`goals-calendar__marker goals-calendar__marker--${event.type}`}
                  aria-hidden="true"
                />
                <span>
                  <strong>{event.title}</strong>
                  <small>{event.type === 'goal' ? 'Goal deadline' : event.goalTitle}</small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No goals or milestones due on this day.</p>
        )}
      </div>
    </section>
  )
}
