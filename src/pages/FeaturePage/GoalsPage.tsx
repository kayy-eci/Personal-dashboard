import { useMemo, useState, type FormEvent } from 'react'
import { EventManager, type Event } from '../../components/event-manager'
import { initialGoals } from '../Dashboard/dashboard-data'
import { DemoNotice, FeaturePanel, ProgressTrack, SummaryGrid } from './FeaturePage.shared'

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

export function GoalsPage() {
  const [goals, setGoals] = useState(startingGoals)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(() => new Set())

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
    ? Math.round(
        goals.reduce(
          (sum, goal) =>
            sum +
            (goal.milestones.filter((milestone) => milestone.done).length /
              goal.milestones.length) *
              100,
          0,
        ) / goals.length,
      )
    : 0

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
    <div className="flex w-full max-w-[100rem] mx-auto flex-col gap-4 p-4 min-[769px]:p-5 min-[769px]:pb-7">
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
              <input className="min-h-10 rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required autoFocus />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Goal deadline
              <input
                className="min-h-10 rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text"
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

        {goals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-sunken p-5 text-center text-sm text-text-muted" role="status">
            No goals yet. Add an outcome you would like to work toward.
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {goals.map((goal) => {
              const doneCount = goal.milestones.filter((milestone) => milestone.done).length
              const percent = goal.milestones.length
                ? Math.round((doneCount / goal.milestones.length) * 100)
                : 0
              const isExpanded = expandedGoalIds.has(goal.id)
              const checklistId = `goal-checklist-${goal.id}`
              return (
                <article className={`${goal.tone === 'gold' ? 'flex flex-col overflow-hidden rounded-lg border border-border border-l-[3px] border-l-[#b45309] bg-surface-overlay' : goal.tone === 'rose' ? 'flex flex-col overflow-hidden rounded-lg border border-border border-l-[3px] border-l-[#e11d48] bg-surface-overlay' : 'flex flex-col overflow-hidden rounded-lg border border-border border-l-[3px] border-l-[#0284c7] bg-surface-overlay'}`} key={goal.id}>
                  <div className="flex min-h-14 min-w-0 items-center justify-between gap-2 p-2 px-3 max-[480px]:gap-1 max-[480px]:p-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3 max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-[0.1rem] [&>h3]:flex-1 [&>h3]:truncate [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-text [&>span]:whitespace-nowrap [&>span]:text-xs [&>span]:text-text-muted">
                      <h3>{goal.title}</h3>
                      <span>{formatTargetDate(goal.targetDate)}</span>
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
                            className="min-h-10 rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text"
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
                          <li key={`${goal.id}-${index}`}>
                            <label>
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
                              className="w-[9.5rem] min-w-0 rounded border border-border bg-surface-overlay p-[0.35rem] text-xs text-text-muted max-[480px]:ml-6 max-[480px]:w-[8.5rem]"
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
                          </li>
                        ))}
                      </ul>
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
