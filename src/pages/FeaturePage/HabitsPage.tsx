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
    <div className="flex w-full max-w-[100rem] mx-auto flex-col gap-4 p-4 min-[769px]:p-5 min-[769px]:pb-7">
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
          { label: 'Active routines', value: String(activeHabits.length), note: `${todayHabits.length} scheduled today`, tone: 'gold' },
          { label: 'Daily completion', value: `${completedToday}/${todayHabits.length}`, note: 'Temporary check-ins', tone: 'emerald' },
          { label: 'Average consistency', value: '89%', note: 'Across tracked routines', tone: 'sky' },
          { label: 'Longest streak', value: '14 days', note: 'Morning Deep Work', tone: 'ember' },
        ]}
      />

      <FeaturePanel
        title="Habits & routines"
        description="Daily and weekly practices with lightweight progress tracking."
        action={
          <button
            type="button"
            className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover"
            onClick={() => setShowForm((visible) => !visible)}
            aria-expanded={showForm}
            aria-controls="create-habit-form"
          >
            {showForm ? 'Cancel' : '+ New habit'}
          </button>
        }
      >
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <input
            className="min-h-10 flex-1 max-w-[24rem] rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text placeholder:text-text-faint"
            type="search"
            placeholder="Search habits"
            aria-label="Search habits"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem] [&>button]:rounded [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-[0.55rem] [&>button]:py-[0.35rem] [&>button]:text-xs [&>button]:font-semibold [&>button]:text-text-muted hover:[&>button]:text-text [&>button[aria-pressed=true]]:border-border [&>button[aria-pressed=true]]:bg-surface-overlay [&>button[aria-pressed=true]]:text-text [&>button[aria-pressed=true]]:shadow-xs" role="group" aria-label="Filter habits">
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
          <form id="create-habit-form" className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-sunken p-3 min-[600px]:grid-cols-3 max-[480px]:grid-cols-1" onSubmit={submitHabit}>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted col-span-full">
              Habit name
              <input
                className="min-h-10 rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                autoFocus
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Schedule
              <select
                className="min-h-10 min-w-32 rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text"
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as 'Daily' | 'Weekly')}
              >
                <option>Daily</option>
                <option>Weekly</option>
              </select>
            </label>
            <div className="col-span-full flex flex-wrap gap-2">
              <button className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover" type="submit">
                Add sample habit
              </button>
            </div>
          </form>
        )}

        {visibleHabits.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-sunken p-5 text-center text-sm text-text-muted" role="status">
            No habits match this view. Try another filter or add a routine.
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2" role="list">
            {visibleHabits.map((habit) => (
              <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-overlay p-3 max-[480px]:items-start" key={habit.id}>
                <div className="flex min-w-0 items-center gap-3">
                  {filter !== 'archived' && (
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] border border-[#cbd5e1] bg-surface-overlay text-[0.8rem] font-bold leading-none text-transparent transition-colors hover:border-[#dc2626] hover:text-[#dc2626] aria-pressed:border-[#059669] aria-pressed:bg-[#059669] aria-pressed:text-white"
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
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-text">{habit.name}</h3>
                    <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-text-muted">
                      <span>{habit.frequency}</span>
                      <span>{habit.difficulty}</span>
                      <span>{habit.streak} day streak</span>
                      {habit.consistency !== null && <span>{habit.consistency}% consistency</span>}
                      {habit.attributes.map((attribute) => <span key={attribute}>{attribute}</span>)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 max-[480px]:flex-col max-[480px]:items-end">
                  <span className={`${habit.done ? 'inline-flex items-center whitespace-nowrap rounded-[5px] border border-[#a7f3d0] bg-[#ecfdf5] px-[0.45rem] py-[0.3rem] font-mono text-[0.65rem] font-bold text-[#047857]' : 'inline-flex items-center whitespace-nowrap rounded-[5px] border border-[#d5e8a0] bg-[#f4f8e8] px-[0.45rem] py-[0.3rem] font-mono text-[0.65rem] font-bold text-brand-text'}`}>
                    {habit.done ? 'Checked in' : `+${habit.reward} ${habit.rewardType}`}
                  </span>
                  <button
                    type="button"
                    className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 min-h-8 px-2 py-[0.35rem] font-semibold"
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
        <div className="flex items-center gap-[0.3rem] rounded-md border border-border bg-surface-sunken px-2 py-1.5" role="img" aria-label="Weekly consistency: Monday through Thursday 100 percent, Friday 75 percent, Saturday 100 percent, Sunday in progress">
          <span className="mr-[0.15rem] font-mono text-[0.65rem] font-bold text-text-muted">MON–SUN</span>
          {['full', 'full', 'full', 'full', 'partial', 'full', 'today'].map((level, index) => (
            <span key={index} className={`${level === 'full' ? 'h-3 w-3 rounded-[3px] bg-[#10b981]' : level === 'partial' ? 'h-3 w-3 rounded-[3px] bg-[#6ee7b7]' : 'h-3 w-3 rounded-[3px] bg-[#0ea5e9] outline outline-2 outline-[#bae6fd] outline-offset-1'}`} aria-hidden="true" />
          ))}
        </div>
      </FeaturePanel>
    </div>
  )
}
