import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { GitHubActivityGrid } from '../../components/github-activity-grid'
import { useGitHubActivity } from '../../hooks/useGitHubActivity'
import { getActivityCopy } from './github-activity-copy'
import type { HabitItem } from '../Dashboard/dashboard-data'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'
import { applySort, type SortOption } from '../../hooks/useListControls'
import {
  archiveHabit,
  checkInHabit,
  createHabit,
  listHabitItems,
  subscribe,
  unarchiveHabit,
  uncheckHabitToday,
} from '../../data'

type ManagedHabit = HabitItem & {
  done: boolean
  archived: boolean
  frequency: 'Daily' | 'Weekly'
}

type HabitFilter = 'all' | 'today' | 'weekly' | 'archived'

const habitSortOptions: SortOption<ManagedHabit>[] = [
  { id: 'streak', label: 'Streak (desc)', compare: (a, b) => b.streak - a.streak },
  { id: 'consistency', label: 'Consistency (desc)', compare: (a, b) => (b.consistency ?? -1) - (a.consistency ?? -1) },
  { id: 'reward', label: 'Reward (desc)', compare: (a, b) => b.reward - a.reward },
  { id: 'name', label: 'Name (A–Z)', compare: (a, b) => a.name.localeCompare(b.name) },
]

export function HabitsPage() {
  const {
    username,
    days: activityDays,
    status: activityStatus,
    source: activitySource,
    hasToken,
  } = useGitHubActivity()
  const [habits, setHabits] = useState<ManagedHabit[]>([])
  const refreshHabits = useCallback(async () => {
    const [active, archived] = await Promise.all([listHabitItems('all'), listHabitItems('archived')])
    setHabits([...active, ...archived].map((h) => ({ ...h, initialDone: h.done })))
  }, [])
  useEffect(() => {
    const id = setTimeout(() => void refreshHabits(), 0)
    const unsub = subscribe('data', () => void refreshHabits())
    return () => {
      clearTimeout(id)
      unsub()
    }
  }, [refreshHabits])
  const [filter, setFilter] = useState<HabitFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('streak')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly'>('Daily')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Med' | 'Hard'>('Easy')
  const [reward, setReward] = useState(20)

  const activeHabits = habits.filter((habit) => !habit.archived)
  const todayHabits = activeHabits.filter((habit) => habit.frequency === 'Daily')
  const completedToday = todayHabits.filter((habit) => habit.done).length
  const consistencyValues = activeHabits
    .map((habit) => habit.consistency)
    .filter((value): value is number => value !== null)
  const averageConsistency = consistencyValues.length
    ? Math.round(consistencyValues.reduce((sum, value) => sum + value, 0) / consistencyValues.length)
    : 0
  const longestStreakHabit = activeHabits.reduce<ManagedHabit | null>(
    (best, habit) => (best === null || habit.streak > best.streak ? habit : best),
    null,
  )
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
  const sortedVisibleHabits = useMemo(
    () => applySort(visibleHabits, sort, habitSortOptions),
    [sort, visibleHabits],
  )

  const submitHabit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    void createHabit({
      name: trimmedName,
      frequency: frequency === 'Daily' ? 'daily' : 'weekly',
      category: 'general',
      difficulty: difficulty === 'Easy' ? 2 : difficulty === 'Med' ? 3 : 5,
      impact: 3,
      attributes: ['FOCUS'],
    }).then(() => refreshHabits())
    setName('')
    setFrequency('Daily')
    setDifficulty('Easy')
    setReward(20)
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
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 p-3 pb-5 min-[769px]:p-4 min-[769px]:pb-6">
      <GitHubActivityGrid
        days={activityDays}
        activityType="contribution"
        periodLabel={activityCopy.periodLabel}
        description={activityCopy.description}
      />
      <DemoNotice>
        Check-ins, edits and archives are stored in this browser and saved to your character stats.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Active routines', value: String(activeHabits.length), note: `${todayHabits.length} scheduled today`, tone: 'gold' },
           { label: 'Daily completion', value: `${completedToday}/${todayHabits.length}`, note: 'Checked in today', tone: 'emerald' },
          { label: 'Average consistency', value: `${averageConsistency}%`, note: 'Across tracked routines', tone: 'sky' },
          { label: 'Longest streak', value: longestStreakHabit ? `${longestStreakHabit.streak} days` : '0 days', note: longestStreakHabit ? longestStreakHabit.name : 'No active habits', tone: 'ember' },
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
            className="min-h-[var(--control-h)] flex-1 max-w-[24rem] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text placeholder:text-text-faint"
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
          <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            Sort
            <select
              className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text"
              aria-label="Sort habits"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {habitSortOptions.map((option) => (
                <option value={option.id} key={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {showForm && (
          <form id="create-habit-form" className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-sunken p-3 min-[600px]:grid-cols-3 max-[480px]:grid-cols-1" onSubmit={submitHabit}>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted col-span-full">
              Habit name
              <input
              className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
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
                className="min-h-[var(--control-h)] min-w-32 rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text"
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as 'Daily' | 'Weekly')}
              >
                <option>Daily</option>
                <option>Weekly</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Difficulty
              <select
                className="min-h-[var(--control-h)] min-w-32 rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as 'Easy' | 'Med' | 'Hard')}
              >
                <option>Easy</option>
                <option>Med</option>
                <option>Hard</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Reward (XP)
              <input
                className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
                type="number"
                min={0}
                max={1000}
                value={reward}
                onChange={(event) => setReward(Math.max(0, Number(event.target.value) || 0))}
              />
            </label>
            <div className="col-span-full flex flex-wrap gap-2">
              <button className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover" type="submit">
                Add sample habit
              </button>
            </div>
          </form>
        )}

        {visibleHabits.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-sunken p-3 text-center text-sm text-text-muted" role="status">
            No habits match this view. Try another filter or add a routine.
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2" role="list">
            {sortedVisibleHabits.map((habit) => (
              <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-overlay p-3 max-[480px]:items-start" key={habit.id}>
                <div className="flex min-w-0 items-center gap-3">
                  {filter !== 'archived' && (
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] border border-[var(--border-strong)] bg-surface-overlay text-[0.8rem] font-bold leading-none text-transparent transition-colors hover:border-[var(--danger-border)] hover:text-[var(--danger)] aria-pressed:border-[var(--success-border)] aria-pressed:bg-[var(--success)] aria-pressed:text-white"
                      aria-pressed={habit.done}
                      aria-label={`${habit.done ? 'Undo' : 'Check in'} ${habit.name}`}
                       onClick={() => {
                         const id = Number(habit.id)
                         void (habit.done ? uncheckHabitToday(id) : checkInHabit(id)).then(() => refreshHabits())
                       }}
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
                  <span className={`${habit.done ? 'inline-flex items-center whitespace-nowrap rounded-[5px] border border-[var(--success-border)] bg-[var(--success-soft)] px-[0.45rem] py-[0.3rem] font-mono text-[0.65rem] font-bold text-[var(--success-text)]' : 'inline-flex items-center whitespace-nowrap rounded-[5px] border border-[var(--brand-outline)] bg-[var(--brand-tint)] px-[0.45rem] py-[0.3rem] font-mono text-[0.65rem] font-bold text-brand-text'}`}>
                    {habit.done ? 'Checked in' : `+${habit.reward} ${habit.rewardType}`}
                  </span>
                  <button
                    type="button"
                    className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 min-h-8 px-2 py-[0.35rem] font-semibold"
                    onClick={() => {
                      const id = Number(habit.id)
                      void (habit.archived ? unarchiveHabit(id) : archiveHabit(id)).then(() => refreshHabits())
                    }}
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
        <div className="flex items-center gap-[0.3rem] rounded-md border border-border bg-surface-sunken px-2 py-1.5" role="img" aria-label="Weekly consistency: sample follow-through Mon–Sun, today highlighted">
          <span className="mr-[0.15rem] font-mono text-[0.65rem] font-bold text-text-muted">MON–SUN</span>
          {['full', 'full', 'full', 'full', 'partial', 'full', 'full'].map((level, index) => {
            const todayIndex = (new Date().getDay() + 6) % 7
            const resolved = index === todayIndex ? 'today' : level
            return (
              <span key={index} className={`${resolved === 'full' ? 'h-3 w-3 rounded-[3px] bg-[var(--success)]' : resolved === 'partial' ? 'h-3 w-3 rounded-[3px] bg-[var(--success-weak)]' : 'h-3 w-3 rounded-[3px] bg-[var(--info)] outline outline-2 outline-[var(--info-border)] outline-offset-1'}`} aria-hidden="true" />
            )
          })}
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Best streak this week: {longestStreakHabit ? `${longestStreakHabit.name} — ${longestStreakHabit.streak} days` : 'No active habits'}
        </p>
      </FeaturePanel>
    </div>
  )
}
