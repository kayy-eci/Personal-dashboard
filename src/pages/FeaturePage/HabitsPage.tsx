import { useMemo, useState, type FormEvent } from 'react'
import { GitHubActivityGrid } from '../../components/github-activity-grid'
import { useGitHubActivity } from '../../hooks/useGitHubActivity'
import { getActivityCopy } from './github-activity-copy'
import type { HabitItem } from '../Dashboard/dashboard-data'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'

type ManagedHabit = HabitItem & {
  done: boolean
  archived: boolean
  frequency: 'Daily' | 'Weekly'
}

type HabitFilter = 'all' | 'today' | 'weekly' | 'archived'

const startingHabits: ManagedHabit[] = [
  {
    id: 'deep-work',
    name: 'Morning Deep Work (90m)',
    attributes: ['FOCUS', 'INT'],
    difficulty: 'Hard',
    streak: 14,
    consistency: 92,
    reward: 45,
    rewardType: 'XP',
    initialDone: true,
    done: true,
    archived: false,
    frequency: 'Daily',
  },
  {
    id: 'strength',
    name: 'Compound Strength Workout',
    attributes: ['STR', 'DISC'],
    difficulty: 'Med',
    streak: 4,
    consistency: 85,
    reward: 60,
    rewardType: 'XP',
    initialDone: false,
    done: false,
    archived: false,
    frequency: 'Weekly',
  },
  {
    id: 'reading',
    name: 'Read 20 pages Technical Book',
    attributes: ['INT', 'FOCUS'],
    difficulty: 'Easy',
    streak: 8,
    consistency: 90,
    reward: 30,
    rewardType: 'XP',
    initialDone: false,
    done: false,
    archived: false,
    frequency: 'Daily',
  },
  {
    id: 'meditation',
    name: 'Mindful Meditation & Mobility',
    attributes: ['Health Recovery'],
    difficulty: 'Easy',
    streak: 12,
    consistency: null,
    reward: 15,
    rewardType: 'HP',
    recovery: true,
    initialDone: false,
    done: false,
    archived: false,
    frequency: 'Daily',
  },
]

export function HabitsPage() {
  const {
    username,
    days: activityDays,
    status: activityStatus,
    source: activitySource,
    hasToken,
  } = useGitHubActivity()
  const [habits, setHabits] = useState(startingHabits)
  const [filter, setFilter] = useState<HabitFilter>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly'>('Daily')

  const activeHabits = habits.filter((habit) => !habit.archived)
  const todayHabits = activeHabits.filter((habit) => habit.frequency === 'Daily')
  const completedToday = todayHabits.filter((habit) => habit.done).length
  const visibleHabits = useMemo(
    () =>
      habits.filter((habit) => {
        const matchesFilter =
          filter === 'all'
            ? !habit.archived
            : filter === 'today'
              ? !habit.archived && habit.frequency === 'Daily'
              : filter === 'weekly'
                ? !habit.archived && habit.frequency === 'Weekly'
                : habit.archived
        return matchesFilter && habit.name.toLowerCase().includes(search.toLowerCase())
      }),
    [filter, habits, search],
  )

  const submitHabit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    setHabits((current) => [
      {
        id: `habit-${Date.now()}`,
        name: trimmedName,
        attributes: ['FOCUS'],
        difficulty: 'Easy',
        streak: 0,
        consistency: null,
        reward: 20,
        rewardType: 'XP',
        initialDone: false,
        done: false,
        archived: false,
        frequency,
      },
      ...current,
    ])
    setName('')
    setFrequency('Daily')
    setFilter(frequency === 'Daily' ? 'today' : 'weekly')
    setShowForm(false)
  }

  const filters: { id: HabitFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All active', count: activeHabits.length },
    { id: 'today', label: 'Daily', count: todayHabits.length },
    { id: 'weekly', label: 'Weekly', count: activeHabits.filter((habit) => habit.frequency === 'Weekly').length },
    { id: 'archived', label: 'Archived', count: habits.length - activeHabits.length },
  ]

  const activityCopy = getActivityCopy(username, activityStatus, activitySource, hasToken)

  return (
    <div className="feature-page feature-page__content">
      <GitHubActivityGrid
        days={activityDays}
        activityType="contribution"
        periodLabel={activityCopy.periodLabel}
        description={activityCopy.description}
      />
      <DemoNotice>
        Sample routines only. Check-ins and edits stay in this browser session and do not update saved player stats.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Active routines', value: String(activeHabits.length), note: `${todayHabits.length} scheduled today`, tone: 'violet' },
          { label: 'Daily completion', value: `${completedToday}/${todayHabits.length}`, note: 'Temporary check-ins', tone: 'emerald' },
          { label: 'Average consistency', value: '89%', note: 'Across tracked routines', tone: 'sky' },
          { label: 'Longest streak', value: '14 days', note: 'Morning Deep Work', tone: 'amber' },
        ]}
      />

      <FeaturePanel
        title="Habits & routines"
        description="Daily and weekly practices with lightweight progress tracking."
        action={
          <button
            type="button"
            className="feature-button feature-button--primary"
            onClick={() => setShowForm((visible) => !visible)}
            aria-expanded={showForm}
            aria-controls="create-habit-form"
          >
            {showForm ? 'Cancel' : '+ New habit'}
          </button>
        }
      >
        <div className="feature-panel__toolbar">
          <input
            className="feature-search"
            type="search"
            placeholder="Search habits"
            aria-label="Search habits"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="feature-filter-group" role="group" aria-label="Filter habits">
            {filters.map(({ id, label, count }) => (
              <button
                type="button"
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label} <span>({count})</span>
              </button>
            ))}
          </div>
        </div>

        {showForm && (
          <form id="create-habit-form" className="feature-form" onSubmit={submitHabit}>
            <label className="feature-form__field feature-form__field--wide">
              Habit name
              <input
                className="feature-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                autoFocus
              />
            </label>
            <label className="feature-form__field">
              Schedule
              <select
                className="feature-select"
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as 'Daily' | 'Weekly')}
              >
                <option>Daily</option>
                <option>Weekly</option>
              </select>
            </label>
            <div className="feature-form__actions">
              <button className="feature-button feature-button--primary" type="submit">
                Add sample habit
              </button>
            </div>
          </form>
        )}

        {visibleHabits.length === 0 ? (
          <div className="feature-empty" role="status">
            No habits match this view. Try another filter or add a routine.
          </div>
        ) : (
          <ul className="feature-list" role="list">
            {visibleHabits.map((habit) => (
              <li className="feature-list__row" key={habit.id}>
                <div className="feature-list__main">
                  {filter !== 'archived' && (
                    <button
                      type="button"
                      className="habit-row__check"
                      aria-pressed={habit.done}
                      aria-label={`${habit.done ? 'Undo' : 'Check in'} ${habit.name}`}
                      onClick={() =>
                        setHabits((current) =>
                          current.map((item) =>
                            item.id === habit.id ? { ...item, done: !item.done } : item,
                          ),
                        )
                      }
                    >
                      {habit.done ? '✓' : ''}
                    </button>
                  )}
                  <div className="feature-list__copy">
                    <h3 className="feature-list__title">{habit.name}</h3>
                    <p className="feature-list__meta">
                      <span>{habit.frequency}</span>
                      <span>{habit.difficulty}</span>
                      <span>{habit.streak} day streak</span>
                      {habit.consistency !== null && <span>{habit.consistency}% consistency</span>}
                      {habit.attributes.map((attribute) => <span key={attribute}>{attribute}</span>)}
                    </p>
                  </div>
                </div>
                <div className="feature-row-actions">
                  <span className={`habit-reward${habit.done ? ' habit-reward--earned' : ''}`}>
                    {habit.done ? 'Checked in' : `+${habit.reward} ${habit.rewardType}`}
                  </span>
                  <button
                    type="button"
                    className="feature-button feature-button--quiet"
                    onClick={() =>
                      setHabits((current) =>
                        current.map((item) =>
                          item.id === habit.id ? { ...item, archived: !item.archived } : item,
                        ),
                      )
                    }
                  >
                    {habit.archived ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FeaturePanel>

      <FeaturePanel title="Weekly consistency" description="A sample view of recent routine follow-through.">
        <div className="habit-week feature-habits__week" role="img" aria-label="Weekly consistency: Monday through Thursday 100 percent, Friday 75 percent, Saturday 100 percent, Sunday in progress">
          <span className="habit-week__label">MON–SUN</span>
          {['full', 'full', 'full', 'full', 'partial', 'full', 'today'].map((level, index) => (
            <span key={index} className={`habit-week__day habit-week__day--${level}`} aria-hidden="true" />
          ))}
        </div>
      </FeaturePanel>
    </div>
  )
}
