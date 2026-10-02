import { useId } from 'react'
import { GoalsIcon, TimelineIcon } from '../../components/icons/Icons'
import { initialGoals, type ActivityEntry } from './dashboard-data'

interface GoalsAndTimelineProps {
  activity: ActivityEntry[]
}

export function GoalsAndTimeline({ activity }: GoalsAndTimelineProps) {
  const goalsHeadingId = useId()
  const timelineHeadingId = useId()

  return (
    <div className="dashboard__side-column">
      <section className="dashboard-panel" aria-labelledby={goalsHeadingId}>
        <div className="dashboard-panel__header">
          <div className="dashboard-panel__title-group">
            <span className="dashboard-panel__icon dashboard-panel__icon--amber">
              <GoalsIcon />
            </span>
            <h2 className="dashboard-panel__title" id={goalsHeadingId}>
              Long-term trajectories
            </h2>
          </div>
          <span className="panel-count">3 active</span>
        </div>

        <div className="goal-list">
          {initialGoals.map((goal) => (
            <article className={`goal-card goal-card--${goal.tone}`} key={goal.title}>
              <div className="goal-card__details">
                <h3>{goal.title}</h3>
                <p>{goal.target}</p>
              </div>
              <span className="goal-card__percent">{goal.progress}%</span>
              <div
                className="goal-card__track"
                role="progressbar"
                aria-label={goal.title}
                aria-valuenow={goal.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${goal.progress}% complete`}
              >
                <span style={{ width: `${goal.progress}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-panel" aria-labelledby={timelineHeadingId}>
        <div className="dashboard-panel__header">
          <div className="dashboard-panel__title-group">
            <span className="dashboard-panel__icon dashboard-panel__icon--sky">
              <TimelineIcon />
            </span>
            <h2 className="dashboard-panel__title" id={timelineHeadingId}>
              Telemetry ledger
            </h2>
          </div>
          <span className="live-indicator"><span /> Demo feed</span>
        </div>

        <ol className="activity-list">
          {activity.map((entry) => (
            <li className={`activity-item activity-item--${entry.tone}`} key={entry.id}>
              <div className="activity-item__meta">
                <time>{entry.time}</time>
                <span>{entry.reward}</span>
              </div>
              <p className="activity-item__title">{entry.title}</p>
              <p className="activity-item__detail">{entry.detail}</p>
            </li>
          ))}
        </ol>
        <p className="dashboard-panel__footnote">
          Sample activity shown for layout preview; this feed is not a saved ledger.
        </p>
      </section>
    </div>
  )
}
