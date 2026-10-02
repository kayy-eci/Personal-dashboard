import { useId } from 'react'
import { HabitsIcon } from '../../components/icons/Icons'
import type { HabitItem } from './dashboard-data'

interface HabitsSectionProps {
  habits: Array<HabitItem & { done: boolean }>
  onToggle: (habit: HabitItem & { done: boolean }) => void
}

const week = [
  { day: 'Mon', level: 'full' },
  { day: 'Tue', level: 'full' },
  { day: 'Wed', level: 'full' },
  { day: 'Thu', level: 'full' },
  { day: 'Fri', level: 'partial' },
  { day: 'Sat', level: 'full' },
  { day: 'Sun', level: 'today' },
]

export function HabitsSection({ habits, onToggle }: HabitsSectionProps) {
  const headingId = useId()

  return (
    <section className="dashboard-panel" id="habits" aria-labelledby={headingId}>
      <div className="dashboard-panel__header">
        <div className="dashboard-panel__title-group">
          <span className="dashboard-panel__icon dashboard-panel__icon--violet">
            <HabitsIcon />
          </span>
          <div>
            <h2 className="dashboard-panel__title" id={headingId}>
              Today&apos;s Habits &amp; Execution
            </h2>
            <p className="dashboard-panel__description">
              Build consistency one check-in at a time.
            </p>
          </div>
        </div>
        <div
          className="habit-week"
          role="img"
          aria-label={`Weekly consistency: ${week
            .map(({ day, level }) => `${day} ${level === 'today' ? 'in progress' : level === 'partial' ? '75 percent' : '100 percent'}`)
            .join(', ')}`}
        >
          <span className="habit-week__label">7D</span>
          {week.map(({ day, level }) => (
            <span
              key={day}
              className={`habit-week__day habit-week__day--${level}`}
              title={`${day}: ${level === 'today' ? 'In progress' : level === 'partial' ? '75%' : '100%'}`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <ul className="habit-list" role="list">
        {habits.map((habit) => (
          <li
            className={`habit-row${habit.done ? ' habit-row--done' : ''}`}
            key={habit.id}
          >
            <button
              type="button"
              className="habit-row__check"
              aria-pressed={habit.done}
              aria-label={`${habit.done ? 'Undo completion of' : 'Mark complete'} ${habit.name}`}
              onClick={() => onToggle(habit)}
            >
              {habit.done ? '✓' : ''}
            </button>

            <div className="habit-row__content">
              <div className="habit-row__title-line">
                <span className="habit-row__name">{habit.name}</span>
                {habit.attributes.map((attribute) => (
                  <span
                    key={attribute}
                    className={`tag tag--${attribute.toLowerCase().replace(' ', '-')}`}
                  >
                    {attribute}
                  </span>
                ))}
                <span className="tag tag--difficulty">{habit.difficulty}</span>
              </div>
              <div className="habit-row__meta">
                <span>{habit.streak}d streak</span>
                {habit.consistency !== null && (
                  <span>{habit.consistency}% consistency</span>
                )}
                {habit.recovery && <span className="habit-row__recovery">Restores vitality</span>}
              </div>
            </div>

            <span className={`habit-reward${habit.done ? ' habit-reward--earned' : ''}`}>
              {habit.done ? 'Earned ' : '+'}
              {habit.reward} {habit.rewardType}
            </span>
          </li>
        ))}
      </ul>
      <p className="dashboard-panel__footnote">
        Demo check-ins are temporary and do not update your saved player stats.
      </p>
    </section>
  )
}
