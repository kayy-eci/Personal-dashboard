import { useMemo, useState, type FormEvent } from 'react'
import { EventManager, type Event } from '../../components/event-manager'
import { initialGoals } from '../Dashboard/dashboard-data'
import { DemoNotice, FeaturePanel, ProgressTrack, SummaryGrid } from './FeaturePage.shared'

interface Goal {
  id: string
  title: string
  targetDate: string
  tone: 'violet' | 'rose' | 'sky'
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
              color: goal.tone === 'violet' ? 'purple' : goal.tone === 'sky' ? 'blue' : 'pink',
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
                color: goal.tone === 'violet' ? 'purple' : goal.tone === 'sky' ? 'blue' : 'pink',
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
        tone: 'violet',
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
    <div className="feature-page feature-page__content">
      <DemoNotice>
        Goal progress here is illustrative. Toggling milestones changes only this temporary view.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Active goals', value: String(goals.length - completedGoals), note: 'Across personal projects', tone: 'violet' },
          { label: 'Average progress', value: `${averageProgress}%`, note: 'Based on milestones', tone: 'sky' },
          { label: 'Milestones complete', value: `${goals.reduce((sum, goal) => sum + goal.milestones.filter((item) => item.done).length, 0)}/${goals.reduce((sum, goal) => sum + goal.milestones.length, 0)}`, note: 'Sample goal data', tone: 'emerald' },
          { label: 'Goals completed', value: String(completedGoals), note: 'All milestones complete', tone: 'amber' },
        ]}
      />

      <FeaturePanel
        title="Goals & milestones"
        description="Schedule goal deadlines and milestone dates, then track progress."
        action={
          <button
            type="button"
            className="feature-button feature-button--primary"
            onClick={() => setShowForm((visible) => !visible)}
            aria-expanded={showForm}
            aria-controls="create-goal-form"
          >
            {showForm ? 'Cancel' : '+ New goal'}
          </button>
        }
      >
        {showForm && (
          <form className="feature-form" id="create-goal-form" onSubmit={submitGoal}>
            <label className="feature-form__field feature-form__field--wide">
              Goal title
              <input className="feature-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required autoFocus />
            </label>
            <label className="feature-form__field">
              Goal deadline
              <input
                className="feature-input"
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </label>
            <div className="feature-form__actions">
              <button className="feature-button feature-button--primary" type="submit">Add sample goal</button>
            </div>
          </form>
        )}

        <EventManager events={goalEvents} categories={['Goal', 'Milestone']} />

        {goals.length === 0 ? (
          <div className="feature-empty" role="status">
            No goals yet. Add an outcome you would like to work toward.
          </div>
        ) : (
          <div className="feature-goal-list">
            {goals.map((goal) => {
              const doneCount = goal.milestones.filter((milestone) => milestone.done).length
              const percent = goal.milestones.length
                ? Math.round((doneCount / goal.milestones.length) * 100)
                : 0
              const isExpanded = expandedGoalIds.has(goal.id)
              const checklistId = `goal-checklist-${goal.id}`
              return (
                <article className={`feature-goal feature-goal--${goal.tone}`} key={goal.id}>
                  <div className="feature-goal__row">
                    <div className="feature-goal__summary">
                      <h3>{goal.title}</h3>
                      <span>{formatTargetDate(goal.targetDate)}</span>
                    </div>
                    <span className="feature-goal__count">{doneCount}/{goal.milestones.length} checklist</span>
                    <span className="feature-goal__percent">{percent}%</span>
                    <button
                      className="feature-goal__toggle"
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
                      className="feature-goal__details"
                      id={checklistId}
                      hidden={!isExpanded}
                    >
                      <div className="feature-goal__details-header">
                        <ProgressTrack label={`${goal.title} progress`} value={percent} />
                        <label className="feature-goal__deadline">
                          Goal deadline
                          <input
                            className="feature-input"
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
                      <ul className="feature-milestones" role="list">
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
                              <span className={milestone.done ? 'is-complete' : ''}>
                                {milestone.title}
                              </span>
                            </label>
                            <input
                              className="feature-milestone-date"
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
