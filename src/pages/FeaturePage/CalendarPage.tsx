import { useMemo } from 'react'
import { EventManager, type Event } from '../../components/event-manager'

const monthDays = [
  { day: 1, items: [{ type: 'quest', label: 'Build REST API' }] },
  { day: 2, items: [{ type: 'habit', label: 'Workout' }] },
  { day: 3, items: [{ type: 'habit', label: 'Read 20 pages' }, { type: 'quest', label: 'Submit assignment' }] },
  { day: 4, items: [{ type: 'habit', label: 'Code 1h' }] },
  { day: 5, items: [] },
  { day: 6, items: [{ type: 'quest', label: 'Portfolio hero' }] },
  { day: 7, items: [] },
  { day: 8, items: [{ type: 'habit', label: 'Review week' }] },
  { day: 9, items: [] },
  { day: 10, items: [{ type: 'quest', label: 'Build REST API' }, { type: 'habit', label: 'Workout' }] },
  { day: 11, items: [] },
  { day: 12, items: [{ type: 'quest', label: 'Deadline' }] },
  { day: 13, items: [] },
  { day: 14, items: [{ type: 'habit', label: 'Read 20 pages' }] },
  { day: 15, items: [] },
  { day: 16, items: [{ type: 'habit', label: 'Code 1h' }] },
  { day: 17, items: [] },
  { day: 18, items: [{ type: 'quest', label: 'Assignment review' }] },
  { day: 19, items: [] },
  { day: 20, items: [{ type: 'habit', label: 'Workout' }, { type: 'quest', label: 'REST API' }] },
  { day: 21, items: [] },
  { day: 22, items: [] },
  { day: 23, items: [{ type: 'habit', label: 'Read 20 pages' }] },
  { day: 24, items: [] },
  { day: 25, items: [{ type: 'quest', label: 'Portfolio' }] },
  { day: 26, items: [] },
  { day: 27, items: [{ type: 'habit', label: 'Code 1h' }] },
  { day: 28, items: [] },
  { day: 29, items: [{ type: 'quest', label: 'Review week' }] },
  { day: 30, items: [] },
  { day: 31, items: [{ type: 'habit', label: 'Workout' }, { type: 'quest', label: 'Daily checkpoint' }] },
] as const

export function CalendarPage() {
  const events = useMemo<Event[]>(
    () =>
      monthDays.flatMap(({ day, items }) =>
        items.map((item, index) => ({
          id: `calendar-${day}-${index}`,
          title: item.label,
          description: undefined,
          startTime: new Date(2026, 9, day, 9 + ((day + index) % 8), 0, 0, 0),
          endTime: new Date(2026, 9, day, 10 + ((day + index) % 8), 0, 0, 0),
          color: item.type === 'quest' ? 'purple' : 'green',
          category: item.type === 'quest' ? 'Task' : 'Personal',
          tags: [],
        })),
      ),
    [],
  )

  return (
    <div className="feature-page feature-page__content">
      <EventManager events={events} categories={['Task', 'Personal']} />
    </div>
  )
}
