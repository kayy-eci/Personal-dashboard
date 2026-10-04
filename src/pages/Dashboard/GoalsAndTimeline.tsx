import { useId, useMemo, useState, type ReactNode } from 'react'
import { GoalsIcon, TimelineIcon } from '../../components/icons/Icons'
import { inRange, type DateRange } from '../../lib/dates'
import { filterAndSort, useSearch, type SortOption } from '../../hooks/useListControls'
import { type ActivityEntry } from './dashboard-data'
import type { GoalView } from '../../data/views'

type ActivityToneFilter = 'all' | 'xp' | 'health'

function parseActivityTimestamp(time: string): Date | null {
  const upper = time.toUpperCase()
  if (upper.includes('TODAY')) return new Date()
  if (upper.includes('YESTERDAY')) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  }
  const parsed = new Date(time)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function goalColor(tone: string) {
  if (tone === 'gold') return 'var(--goal-gold)'
  if (tone === 'rose') return 'var(--goal-rose)'
  return 'var(--goal-blue)'
}

interface GoalsPanelProps {
  xpTotals: { today: number; week: number; month: number }
  goals: GoalView[]
  /** Rendered at the end of the header — the section menu. */
  menu?: ReactNode
}

/** Long-term trajectories (`next-milestone` in the Dashboard section registry). */
export function GoalsPanel({ xpTotals, goals, menu }: GoalsPanelProps) {
  const goalsHeadingId = useId()
  const [goalSort, setGoalSort] = useState<'progress' | 'tone'>('progress')

  const activeGoals = goals.filter((goal) => goal.progress < 100)
  const sortedGoals = useMemo(() => {
    const copy = [...goals]
    return goalSort === 'progress'
      ? copy.sort((a, b) => b.progress - a.progress)
      : copy.sort((a, b) => a.tone.localeCompare(b.tone))
  }, [goalSort, goals])

  return (
    <section
      className="group/section min-w-0 rounded-xl border border-border bg-surface p-[var(--section-pad)] shadow-xs"
      aria-labelledby={goalsHeadingId}
    >
      <div className="flex items-center justify-between gap-2.5 border-b border-border pb-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-warning-border bg-warning-soft text-warning-text">
            <GoalsIcon className="h-[1.1rem] w-[1.1rem]" />
          </span>
          <h2 className="text-lg font-bold leading-[1.3] text-text" id={goalsHeadingId}>
            Long-term trajectories
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 rounded-md bg-surface-sunken px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-text-muted">
            {activeGoals.length} active
          </span>
          {menu}
        </div>
      </div>

      <label className="mt-2.5 flex w-fit items-center gap-1.5 text-xs font-semibold text-text-muted">
        Sort goals
        <select
          className="rounded-md border border-border-strong bg-surface-overlay px-2 py-1 text-xs text-text"
          value={goalSort}
          onChange={(event) => setGoalSort(event.target.value as 'progress' | 'tone')}
        >
          <option value="progress">Progress (high → low)</option>
          <option value="tone">Tone</option>
        </select>
      </label>

      <p className="mt-2 text-xs text-text-muted">
        XP earned — today: <strong className="text-text">{xpTotals.today}</strong> · week:{' '}
        <strong className="text-text">{xpTotals.week}</strong> · month:{' '}
        <strong className="text-text">{xpTotals.month}</strong>
      </p>

      <div className="mt-2.5 flex flex-col gap-2.5">
        {sortedGoals.map((goal) => (
          <article
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-[10px] border border-l-4 border-border bg-surface-sunken p-2.5"
            key={goal.title}
            style={{ borderLeftColor: goalColor(goal.tone) }}
          >
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-[1.4] text-text">{goal.title}</h3>
              <p className="mt-1 font-mono text-[0.65rem] text-text-muted">{goal.target}</p>
            </div>
            <span className="font-mono text-sm font-bold" style={{ color: goalColor(goal.tone) }}>
              {goal.progress}%
            </span>
            <div
              className="col-span-full h-[0.45rem] overflow-hidden rounded-pill bg-goal-soft"
              role="progressbar"
              aria-label={goal.title}
              aria-valuenow={goal.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${goal.progress}% complete`}
            >
              <span
                className="block h-full rounded-[inherit]"
                style={{ width: `${goal.progress}%`, backgroundColor: goalColor(goal.tone) }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

interface ActivityPanelProps {
  activity: ActivityEntry[]
  dateRange: DateRange | null
  /** Rendered at the end of the header — the section menu. */
  menu?: ReactNode
}

/** Telemetry ledger (`recent-activity` in the Dashboard section registry). */
export function ActivityPanel({ activity, dateRange, menu }: ActivityPanelProps) {
  const timelineHeadingId = useId()
  const [toneFilter, setToneFilter] = useState<ActivityToneFilter>('all')
  const [activitySort, setActivitySort] = useState<'newest' | 'oldest'>('newest')
  const { query, setQuery } = useSearch()

  const rangedActivity = activity.filter((entry) => {
    const parsed = parseActivityTimestamp(entry.time)
    if (parsed === null) return dateRange === null
    return inRange(parsed, dateRange)
  })

  const activitySortOptions: SortOption<ActivityEntry>[] = [
    {
      id: 'newest',
      label: 'Newest',
      compare: (a, b) => {
        const ta = parseActivityTimestamp(a.time)?.getTime() ?? 0
        const tb = parseActivityTimestamp(b.time)?.getTime() ?? 0
        return tb - ta
      },
    },
    {
      id: 'oldest',
      label: 'Oldest',
      compare: (a, b) => {
        const ta = parseActivityTimestamp(a.time)?.getTime() ?? 0
        const tb = parseActivityTimestamp(b.time)?.getTime() ?? 0
        return ta - tb
      },
    },
  ]

  const visibleActivity = filterAndSort(
    rangedActivity,
    query,
    (entry) => [entry.title, entry.detail, entry.reward, entry.time],
    [
      (entry) =>
        toneFilter === 'all' || (toneFilter === 'xp' ? entry.tone === 'xp' : entry.tone === 'health'),
    ],
    activitySort,
    activitySortOptions,
  )

  const exportCsv = () => {
    const header = 'time,title,reward,detail,tone'
    const rows = visibleActivity.map((entry) =>
      [entry.time, entry.title, entry.reward, entry.detail, entry.tone]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'activity-export.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section
      className="group/section min-w-0 rounded-xl border border-border bg-surface p-[var(--section-pad)] shadow-xs"
      aria-labelledby={timelineHeadingId}
    >
      <div className="flex items-center justify-between gap-2.5 border-b border-border pb-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-info-border bg-info-soft text-info-text">
            <TimelineIcon className="h-[1.1rem] w-[1.1rem]" />
          </span>
          <h2 className="text-lg font-bold leading-[1.3] text-text" id={timelineHeadingId}>
            Telemetry ledger
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-[0.35rem] whitespace-nowrap font-mono text-[0.65rem] font-bold text-success-text">
              <span className="h-[0.45rem] w-[0.45rem] rounded-full bg-success" /> Live feed
            </span>
          {menu}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <input
          className="min-h-[var(--control-h)] flex-1 max-w-[24rem] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text placeholder:text-text-faint"
          type="search"
          placeholder="Search activity"
          aria-label="Search activity"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div
          className="flex gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem]"
          role="group"
          aria-label="Filter activity by tone"
        >
          {([['all', 'All'], ['xp', 'XP'], ['health', 'HP']] as Array<[ActivityToneFilter, string]>).map(
            ([id, label]) => (
              <button
                type="button"
                key={id}
                className={`rounded border px-2 py-[0.3rem] text-xs font-semibold transition-colors ${toneFilter === id ? 'border-border bg-surface text-text shadow-xs' : 'border-transparent bg-transparent text-text-muted hover:text-text'}`}
                aria-pressed={toneFilter === id}
                onClick={() => setToneFilter(id)}
              >
                {label}
              </button>
            ),
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
          Sort
          <select
            className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-2 py-1 text-sm text-text"
            value={activitySort}
            onChange={(event) => setActivitySort(event.target.value as 'newest' | 'oldest')}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
        <button
          type="button"
          className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface px-[var(--pad-x)] py-[var(--pad-y)] text-xs font-bold uppercase tracking-[0.035em] text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
          onClick={exportCsv}
        >
          Export CSV
        </button>
      </div>

      <ol className="relative mt-3 flex flex-col gap-3 pl-[1.15rem] before:absolute before:bottom-[0.35rem] before:left-[0.3rem] before:top-[0.35rem] before:w-0.5 before:bg-border-strong before:content-['']">
        {visibleActivity.map((entry) => (
          <li
            className={`relative before:absolute before:left-[-1.15rem] before:top-1 before:h-[0.65rem] before:w-[0.65rem] before:rounded-full before:border-2 before:content-[''] ${entry.tone === 'health' ? 'before:border-danger-border before:bg-danger' : 'before:border-xp-soft before:bg-xp'}`}
            key={entry.id}
          >
            <div className="flex items-center justify-between gap-2 font-mono text-[0.625rem] text-text-faint">
              <time>{entry.time}</time>
              <span
                className={`whitespace-nowrap rounded border px-1.5 py-0.5 font-bold ${entry.tone === 'health' ? 'border-danger-border bg-danger-soft text-danger-text' : 'border-success-border bg-success-soft text-success-text'}`}
              >
                {entry.reward}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold leading-[1.4] text-text">{entry.title}</p>
            <p className="mt-1.5 rounded-md border border-border bg-surface-sunken p-1.5 font-mono text-[0.65rem] leading-[1.45] text-text-muted">
              {entry.detail}
            </p>
          </li>
        ))}
      </ol>
      {visibleActivity.length === 0 && (
        <p className="mt-3 text-xs text-text-muted">No activity matches the current filters.</p>
      )}
      <p className="mt-3 text-[0.6875rem] leading-[1.5] text-text-faint">
        Recorded from your real completions, vitality and level events.
      </p>
    </section>
  )
}
