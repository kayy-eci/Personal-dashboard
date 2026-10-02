import { useState } from 'react'
import { usePlayerStatus } from '../../features/player/usePlayerStatus'
import { initialHabits } from '../Dashboard/dashboard-data'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'

const analytics = {
  '7d': {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    activity: [42, 68, 55, 86, 61, 74, 52],
    completion: [80, 100, 75, 100, 75, 100, 50],
    xp: '420',
  },
  '30d': {
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
    activity: [48, 70, 58, 88],
    completion: [72, 84, 78, 91],
    xp: '1,840',
  },
  '90d': {
    labels: ['Aug 1', 'Aug 2', 'Aug 3', 'Sep 1', 'Sep 2', 'Sep 3', 'Oct 1', 'Oct 2', 'Oct 3'],
    activity: [34, 51, 66, 48, 72, 63, 78, 70, 91],
    completion: [66, 72, 80, 74, 82, 85, 78, 90, 94],
    xp: '5,260',
  },
} as const

type Period = keyof typeof analytics

export function AnalyticsPage() {
  const status = usePlayerStatus()
  const [period, setPeriod] = useState<Period>('7d')
  const data = analytics[period]
  const averageConsistency = Math.round(
    initialHabits.reduce((sum, habit) => sum + (habit.consistency ?? 100), 0) /
      initialHabits.length,
  )
  const topAttribute = [...status.attributes].sort((a, b) => b.xp - a.xp)[0]

  return (
    <div className="feature-page feature-page__content">
      <DemoNotice>
        Analytics are visual previews based on sample activity and do not represent a verified personal history.
      </DemoNotice>
      <div className="feature-panel__toolbar feature-analytics__toolbar">
        <p className="feature-analytics__period-label">
          Overview period
          <span>{period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}</span>
        </p>
        <div className="feature-filter-group" role="group" aria-label="Analytics time period">
          {(['7d', '30d', '90d'] as const).map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <SummaryGrid
        items={[
          { label: 'Habit consistency', value: `${averageConsistency}%`, note: 'Average tracked routines', tone: 'emerald' },
          { label: 'XP earned', value: data.xp, note: `During the last ${period}`, tone: 'violet' },
          { label: 'Active streak', value: `${status.currentStreak} days`, note: 'Current sample streak', tone: 'amber' },
          { label: 'Top attribute', value: topAttribute.key, note: `${topAttribute.xp.toLocaleString()} ${topAttribute.label} XP`, tone: 'sky' },
        ]}
      />

      <div className="feature-analytics__grid">
        <FeaturePanel title="Activity by day" description="Relative sample completion volume.">
          <div className="feature-chart" role="img" aria-label={`${period} activity chart`}>
            {data.labels.map((label, index) => (
              <div className="feature-chart__column" key={label}>
                <span className="feature-chart__value">{data.activity[index]}</span>
                <span
                  className="feature-chart__bar"
                  style={{ height: `${data.activity[index]}%` }}
                />
                <span className="feature-chart__label">{label}</span>
              </div>
            ))}
          </div>
        </FeaturePanel>

        <FeaturePanel title="Habit consistency" description="Sample follow-through by routine.">
          <div className="feature-analytics__habits">
            {initialHabits.map((habit) => (
              <div className="feature-analytics__habit" key={habit.id}>
                <div>
                  <span>{habit.name}</span>
                  <strong>{habit.consistency ?? 100}%</strong>
                </div>
                <div className="feature-analytics__track" role="progressbar" aria-label={`${habit.name} consistency`} aria-valuenow={habit.consistency ?? 100} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${habit.consistency ?? 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </FeaturePanel>

        <FeaturePanel title="Weekly completion rate" description="Sample completion percentage over time.">
          <div className="feature-chart feature-chart--completion" role="img" aria-label={`${period} completion rate chart`}>
            {data.labels.map((label, index) => (
              <div className="feature-chart__column" key={label}>
                <span className="feature-chart__value">{data.completion[index]}%</span>
                <span
                  className="feature-chart__bar"
                  style={{ height: `${data.completion[index]}%` }}
                />
                <span className="feature-chart__label">{label}</span>
              </div>
            ))}
          </div>
        </FeaturePanel>

        <FeaturePanel title="Focus opportunities" description="A neutral prompt for reviewing neglected routines.">
          <div className="feature-analytics__insight">
            <span className="dashboard-panel__icon dashboard-panel__icon--amber">↗</span>
            <div>
              <h3>Review the least consistent routine</h3>
              <p>
                Sample data suggests protecting time for {initialHabits.find((habit) => habit.consistency === Math.min(...initialHabits.map((item) => item.consistency ?? 100)))?.name.toLowerCase()}.
                Small adjustments can make a routine easier to repeat.
              </p>
            </div>
          </div>
        </FeaturePanel>
      </div>
    </div>
  )
}
