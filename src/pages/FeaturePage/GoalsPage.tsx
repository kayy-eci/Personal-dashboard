import { useMemo, useState, type FormEvent } from 'react'
import { EventManager, type Event } from '../../components/event-manager'
import { initialGoals } from '../Dashboard/dashboard-data'
import { DemoNotice, FeaturePanel, ProgressTrack, SummaryGrid } from './FeaturePage.shared'
import { usePersistentState } from '../../lib/storage'
import { applySort, type SortOption } from '../../hooks/useListControls'

interface Goal {
  id: string
  title: string
  targetDate: string
  tone: 'gold' | 'rose' | 'sky'
  milestones: Array<{ title: string; done: boolean; dueDate: string }>
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return dateKey(result)
}

function parseTargetDate(target: string) {
  const match = target.match(/([A-Za-z]{3,})\s+(\d{1,2})/)
  if (!match) return ''

  const today = new Date()
  const year = today.getFullYear()
  let date = new Date(`${match[1]} ${match[2]}, ${year} 12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    date = new Date(`${match[1]} ${match[2]}, ${year + 1} 12:00:00`)
  }
  return dateKey(date)
}

function formatTargetDate(value: string) {
  if (!value) return 'No target date'
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const startingGoals: Goal[] = initialGoals.map((goal, index) => {
  const targetDate = parseTargetDate(goal.target)
  const milestoneTitles = [
    'Define the next concrete step',
    'Complete a focused work session',
    'Review progress and adjust',
    'Share or document the result',
    'Plan the next milestone',
  ].slice(0, index === 1 ? 4 : 5)

  return {
    id: `goal-${index}`,
    title: goal.title,
    targetDate,
    tone: goal.tone,
    milestones: milestoneTitles.map((title, milestoneIndex) => ({
      title,
      done: milestoneIndex < (index === 0 ? 3 : 2),
      dueDate: targetDate
        ? addDays(
            new Date(`${targetDate}T12:00:00`),
            milestoneIndex - milestoneTitles.length,
          )
        : '',
    })),
  }
})

function goalProgress(goal: Goal) {
  if (goal.milestones.length === 0) return 0
  return Math.round((goal.milestones.filter((milestone) => milestone.done).length / goal.milestones.length) * 100)
}

function isOverdue(goal: Goal) {
  if (!goal.targetDate || goalProgress(goal) >= 100) return false
  const target = new Date(`${goal.targetDate}T23:59:59`)
  return !Number.isNaN(target.getTime()) && target < new Date()
}

type GoalStatus = 'active' | 'overdue' | 'complete'

function goalStatus(goal: Goal): GoalStatus {
  if (goalProgress(goal) >= 100 && goal.milestones.length > 0) return 'complete'
  if (isOverdue(goal)) return 'overdue'
  return 'active'
}

const goalSortOptions: SortOption<Goal>[] = [
  { id: 'deadline', label: 'Deadline (soonest)', compare: (a, b) => (a.targetDate || '9999-12-31').localeCompare(b.targetDate || '9999-12-31') },
  { id: 'progress', label: 'Progress (desc)', compare: (a, b) => goalProgress(b) - goalProgress(a) },
  { id: 'title', label: 'Title (A–Z)', compare: (a, b) => a.title.localeCompare(b.title) },
]

export function GoalsPage() {
  const [goals, setGoals] = usePersistentState('goals-page:goals', startingGoals)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('all')
  const [sort, setSort] = useState('deadline')
  const [newMilestoneText, setNewMilestoneText] = useState<Record<string, string>>({})

  const goalEvents = useMemo<Event[]>(
    () =>
      goals.flatMap((goal) => [
        ...(goal.targetDate
          ? [{
              id: `${goal.id}-deadline`,
              title: goal.title,
              description: goal.title,
              startTime: new Date(`${goal.targetDate}T09:00:00`),
              endTime: new Date(`${goal.targetDate}T10:00:00`),
              color: goal.tone === 'gold' ? 'gold' : goal.tone === 'sky' ? 'blue' : 'pink',
              category: 'Goal',
              tags: [],
            }]
          : []),
        ...goal.milestones.flatMap((milestone, index) =>
          milestone.dueDate
            ? [{
                id: `${goal.id}-milestone-${index}`,
                title: milestone.title,
                description: goal.title,
                startTime: new Date(`${milestone.dueDate}T09:00:00`),
                endTime: new Date(`${milestone.dueDate}T10:00:00`),
                color: goal.tone === 'gold' ? 'gold' : goal.tone === 'sky' ? 'blue' : 'pink',
                category: 'Milestone',
                tags: [],
              }]
            : [],
        ),
      ]),
    [goals],
  )

  const completedGoals = goals.filter(
    (goal) => goal.milestones.length > 0 && goal.milestones.every((milestone) => milestone.done),
  ).length
  const averageProgress = goals.length
    ? Math.round(goals.reduce((sum, goal) => sum + goalProgress(goal), 0) / goals.length)
    : 0
  const visibleGoals = useMemo(
    () =>
      applySort(
        goals.filter(
          (goal) =>
            goal.title.toLowerCase().includes(search.trim().toLowerCase()) &&
            (statusFilter === 'all' || goalStatus(goal) === statusFilter),
        ),
        sort,
        goalSortOptions,
      ),
    [goals, search, sort, statusFilter],
  )

  const submitGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    setGoals((current) => [
      {
        id: `goal-${Date.now()}`,
        title: trimmedTitle,
        targetDate,
        tone: 'gold',
        milestones: [
          { title: 'Define the next concrete step', done: false, dueDate: '' },
          { title: 'Review progress and adjust', done: false, dueDate: '' },
        ],
      },
      ...current,
    ])
    setTitle('')
    setTargetDate('')
    setShowForm(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 p-3 pb-5 min-[769px]:p-4 min-[769px]:pb-6">
      <DemoNotice>
        Goal progress here is illustrative. Toggling milestones changes only this temporary view.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Active goals', value: String(goals.length - completedGoals), note: 'Across personal projects', tone: 'gold' },
          { label: 'Average progress', value: `${averageProgress}%`, note: 'Based on milestones', tone: 'sky' },
          { label: 'Milestones complete', value: `${goals.reduce((sum, goal) => sum + goal.milestones.filter((item) => item.done).length, 0)}/${goals.reduce((sum, goal) => sum + goal.milestones.length, 0)}`, note: 'Sample goal data', tone: 'emerald' },
          { label: 'Goals completed', value: String(completedGoals), note: 'All milestones complete', tone: 'ember' },
        ]}
      />

      <FeaturePanel
        title="Goals & milestones"
        description="Schedule goal deadlines and milestone dates, then track progress."
        action={
          <button
            type="button"
            className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover"
            onClick={() => setShowForm((visible) => !visible)}
            aria-expanded={showForm}
            aria-controls="create-goal-form"
          >
            {showForm ? 'Cancel' : '+ New goal'}
          </button>
        }
      >
        {showForm && (
          <form className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-sunken p-3 min-[600px]:grid-cols-3 max-[480px]:grid-cols-1" id="create-goal-form" onSubmit={submitGoal}>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted col-span-full">
              Goal title
              <input className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required autoFocus />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Goal deadline
              <input
                className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text"
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </label>
            <div className="col-span-full flex flex-wrap gap-2">
              <button className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover" type="submit">Add sample goal</button>
            </div>
          </form>
        )}

        <EventManager events={goalEvents} categories={['Goal', 'Milestone']} />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <input
            className="min-h-[var(--control-h)] flex-1 max-w-[24rem] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-brand"
            type="search"
            placeholder="Search goals"
            aria-label="Search goals"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem] [&>button]:rounded [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-[0.55rem] [&>button]:py-[0.35rem] [&>button]:text-xs [&>button]:font-semibold [&>button]:text-text-muted hover:[&>button]:text-text [&>button[aria-pressed=true]]:border-border [&>button[aria-pressed=true]]:bg-surface-overlay [&>button[aria-pressed=true]]:text-text [&>button[aria-pressed=true]]:shadow-xs" role="group" aria-label="Filter goals by status">
            {(['all', 'active', 'overdue', 'complete'] as const).map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={statusFilter === option}
                onClick={() => setStatusFilter(option)}
              >
                {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            Sort
            <select
              className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
              aria-label="Sort goals"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {goalSortOptions.map((option) => (
                <option value={option.id} key={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {goals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-sunken p-3 text-center text-sm text-text-muted" role="status">
            No goals yet. Add an outcome you would like to work toward.
          </div>
        ) : visibleGoals.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border-strong bg-surface-sunken p-3 text-center text-sm text-text-muted" role="status">
            No goals match this search and status filter.
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {visibleGoals.map((goal) => {
              const doneCount = goal.milestones.filter((milestone) => milestone.done).length
              const percent = goalProgress(goal)
              const isExpanded = expandedGoalIds.has(goal.id)
              const checklistId = `goal-checklist-${goal.id}`
              return (
                <article className={`${goal.tone === 'gold' ? 'flex flex-col overflow-hidden rounded-lg border border-border border-l-[3px] border-l-[var(--goal-gold)] bg-surface-overlay' : goal.tone === 'rose' ? 'flex flex-col overflow-hidden rounded-lg border border-border border-l-[3px] border-l-[var(--goal-rose)] bg-surface-overlay' : 'flex flex-col overflow-hidden rounded-lg border border-border border-l-[3px] border-l-[var(--goal-blue)] bg-surface-overlay'}`} key={goal.id}>
                  <div className="flex min-h-14 min-w-0 items-center justify-between gap-2 p-2 px-3 max-[480px]:gap-1 max-[480px]:p-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3 max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-[0.1rem] [&>h3]:flex-1 [&>h3]:truncate [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-text [&>span]:whitespace-nowrap [&>span]:text-xs [&>span]:text-text-muted">
                      <h3>{goal.title}</h3>
                      <span>{formatTargetDate(goal.targetDate)}</span>
                      {isOverdue(goal) && (
                        <span className="inline-flex items-center rounded border border-[var(--danger-border)] bg-[var(--danger-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--danger-text)]">Overdue</span>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-xs text-text-muted max-[480px]:text-[0.625rem]">{doneCount}/{goal.milestones.length} checklist</span>
                    <span className="min-w-10 text-right font-mono text-sm font-bold text-brand-text">{percent}%</span>
                    <button
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-transparent text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
                      type="button"
                      aria-label={`${isExpanded ? 'Hide' : 'Show'} checklist for ${goal.title}`}
                      aria-expanded={isExpanded}
                      aria-controls={checklistId}
                      onClick={() =>
                        setExpandedGoalIds((current) => {
                          const next = new Set(current)
                          if (next.has(goal.id)) next.delete(goal.id)
                          else next.add(goal.id)
                          return next
                        })
                      }
                    >
                      <span aria-hidden="true">⌄</span>
                    </button>
                  </div>
                    <div
                      className="flex flex-col gap-3 border-t border-border bg-surface-sunken p-3 [[hidden]]:hidden"
                      id={checklistId}
                      hidden={!isExpanded}
                    >
                      <div className="flex items-center justify-between gap-3 max-[480px]:flex-col max-[480px]:items-start">
                        <ProgressTrack label={`${goal.title} progress`} value={percent} />
                        <label className="flex items-center gap-2 text-xs text-text-muted max-[480px]:flex-col max-[480px]:items-start">
                          Goal deadline
                          <input
                            className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text"
                            type="date"
                            aria-label={`Goal deadline for ${goal.title}`}
                            value={goal.targetDate}
                            onChange={(event) =>
                              setGoals((current) =>
                                current.map((item) =>
                                  item.id === goal.id
                                    ? { ...item, targetDate: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                       <ul className="flex flex-col border-t border-border" role="list">
                        {goal.milestones.map((milestone, index) => (
                          <li key={`${goal.id}-${index}`} className="flex items-center gap-2">
                            <label className="flex flex-1 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={milestone.done}
                                onChange={() =>
                                  setGoals((current) =>
                                    current.map((item) =>
                                      item.id === goal.id
                                        ? {
                                            ...item,
                                            milestones: item.milestones.map((step, stepIndex) =>
                                              stepIndex === index
                                                ? { ...step, done: !step.done }
                                                : step,
                                            ),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <span className={milestone.done ? 'text-text-muted line-through' : ''}>
                                {milestone.title}
                              </span>
                            </label>
                            <input
                              className="w-[9.5rem] min-w-0 rounded border border-border bg-surface-overlay p-[0.35rem] text-xs text-text-muted max-[480px]:w-[8.5rem]"
                              type="date"
                              aria-label={`Due date for ${milestone.title} in ${goal.title}`}
                              value={milestone.dueDate}
                              onChange={(event) =>
                                setGoals((current) =>
                                  current.map((item) =>
                                    item.id === goal.id
                                      ? {
                                          ...item,
                                          milestones: item.milestones.map((step, stepIndex) =>
                                            stepIndex === index
                                              ? { ...step, dueDate: event.target.value }
                                              : step,
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                            <button
                              type="button"
                              className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-text-muted transition-colors hover:border-[var(--danger-border)] hover:text-[var(--danger)]"
                              aria-label={`Delete milestone ${milestone.title} from ${goal.title}`}
                              onClick={() =>
                                setGoals((current) =>
                                  current.map((item) =>
                                    item.id === goal.id
                                      ? { ...item, milestones: item.milestones.filter((_, stepIndex) => stepIndex !== index) }
                                      : item,
                                  ),
                                )
                              }
                            >
                              <span aria-hidden="true">×</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <form
                        className="flex items-center gap-2 border-t border-border pt-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          const trimmed = (newMilestoneText[goal.id] ?? '').trim()
                          if (!trimmed) return
                          setGoals((current) =>
                            current.map((item) =>
                              item.id === goal.id
                                ? { ...item, milestones: [...item.milestones, { title: trimmed, done: false, dueDate: '' }] }
                                : item,
                            ),
                          )
                          setNewMilestoneText((current) => ({ ...current, [goal.id]: '' }))
                        }}
                      >
                        <input
                          className="min-h-[var(--control-h)] flex-1 min-w-0 rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-brand"
                          type="text"
                          placeholder="Add milestone"
                          aria-label={`New milestone for ${goal.title}`}
                          value={newMilestoneText[goal.id] ?? ''}
                          onChange={(event) =>
                            setNewMilestoneText((current) => ({ ...current, [goal.id]: event.target.value }))
                          }
                          maxLength={120}
                        />
                        <button
                          type="submit"
                          className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 min-h-8 px-2 py-[0.35rem] font-semibold"
                        >
                          Add
                        </button>
                      </form>
                    </div>
                </article>
              )
            })}
          </div>
        )}
      </FeaturePanel>
    </div>
  )
}
