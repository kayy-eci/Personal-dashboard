import { useMemo, useState } from 'react'

export interface ManagedEvent {
  id: string
  date: string
  title: string
  goalTitle: string
  type: 'goal' | 'milestone'
}

interface EventManagerProps {
  events: ManagedEvent[]
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function EventManager({ events }: EventManagerProps) {
  const today = new Date()
  const todayKey = dateKey(today)
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
    const mondayOffset = (firstDay.getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - mondayOffset + 1)
      return { date, key: dateKey(date) }
    })
  }, [month])
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ManagedEvent[]>()
    for (const event of events) {
      if (!event.date) continue
      const existing = grouped.get(event.date) ?? []
      existing.push(event)
      grouped.set(event.date, existing)
    }
    return grouped
  }, [events])
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const selectedLabel = formatDate(new Date(`${selectedDate}T12:00:00`))

  const changeMonth = (offset: number) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(nextMonth)
    setSelectedDate(dateKey(nextMonth))
  }

  const goToToday = () => {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(todayKey)
  }

  return (
    <section className="event-manager" aria-label="Goal and milestone calendar">
      <header className="event-manager__header">
        <div>
          <h3>{monthLabel}</h3>
          <p>Goal deadlines and milestone due dates</p>
        </div>
        <div className="event-manager__controls" aria-label="Calendar navigation">
          <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>
            &larr;
          </button>
          <button type="button" onClick={goToToday}>Today</button>
          <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>
            &rarr;
          </button>
        </div>
      </header>

      <div className="event-manager__grid" role="grid" aria-label={monthLabel}>
        <div className="event-manager__week event-manager__week--head" role="row">
          {weekdays.map((day) => (
            <span role="columnheader" key={day}>{day}</span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, weekIndex) => (
          <div className="event-manager__week" role="row" key={weekIndex}>
            {days.slice(weekIndex * 7, weekIndex * 7 + 7).map(({ date, key }) => {
              const dayEvents = eventsByDate.get(key) ?? []
              const isSelected = selectedDate === key
              const isToday = todayKey === key
              const isOutsideMonth = date.getMonth() !== month.getMonth()
              return (
                <div className="event-manager__cell" role="gridcell" key={key}>
                  <button
                    className={[
                      'event-manager__day',
                      isSelected && 'event-manager__day--selected',
                      isToday && 'event-manager__day--today',
                      isOutsideMonth && 'event-manager__day--outside',
                    ].filter(Boolean).join(' ')}
                    type="button"
                    aria-label={`${formatDate(date)}${dayEvents.length ? `, ${dayEvents.length} scheduled ${dayEvents.length === 1 ? 'item' : 'items'}` : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDate(key)}
                  >
                    <span className="event-manager__date">{date.getDate()}</span>
                    <span className="event-manager__events" aria-hidden="true">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          className={`event-manager__event event-manager__event--${event.type}`}
                          key={event.id}
                        >
                          {event.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="event-manager__more">+{dayEvents.length - 2}</span>
                      )}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="event-manager__agenda" aria-live="polite">
        <h4>{selectedLabel}</h4>
        {selectedEvents.length ? (
          <ul>
            {selectedEvents.map((event) => (
              <li key={event.id}>
                <span className={`event-manager__marker event-manager__marker--${event.type}`} aria-hidden="true" />
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
