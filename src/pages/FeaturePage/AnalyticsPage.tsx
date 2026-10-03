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
    <div className="flex w-full max-w-[100rem] mx-auto flex-col gap-4 p-4 min-[769px]:p-5 min-[769px]:pb-7">
      <DemoNotice>
        Analytics are visual previews based on sample activity and do not represent a verified personal history.
      </DemoNotice>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-col text-sm font-bold text-text">
          Overview period
          <span className="text-xs font-normal text-text-muted">{period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}</span>
        </p>
        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem] [&>button]:rounded [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-[0.55rem] [&>button]:py-[0.35rem] [&>button]:text-xs [&>button]:font-semibold [&>button]:text-text-muted hover:[&>button]:text-text [&>button[aria-pressed=true]]:border-border [&>button[aria-pressed=true]]:bg-surface-overlay [&>button[aria-pressed=true]]:text-text [&>button[aria-pressed=true]]:shadow-xs" role="group" aria-label="Analytics time period">
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
          { label: 'XP earned', value: data.xp, note: `During the last ${period}`, tone: 'gold' },
          { label: 'Active streak', value: `${status.currentStreak} days`, note: 'Current sample streak', tone: 'ember' },
          { label: 'Top attribute', value: topAttribute.key, note: `${topAttribute.xp.toLocaleString()} ${topAttribute.label} XP`, tone: 'sky' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
        <FeaturePanel title="Activity by day" description="Relative sample completion volume.">
          <div className="flex min-h-[13rem] items-end justify-around gap-2 border-b border-border-strong bg-[length:100%_25%] bg-[linear-gradient(to_bottom,transparent_calc(25%_-_1px),var(--border)_25%,transparent_calc(25%_+_1px),transparent_calc(50%_-_1px),var(--border)_50%,transparent_calc(50%_+_1px),transparent_calc(75%_-_1px),var(--border)_75%,transparent_calc(75%_+_1px))] px-2 pt-4" role="img" aria-label={`${period} activity chart`}>
            {data.labels.map((label, index) => (
              <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" key={label}>
                <span className="font-mono text-[0.625rem] tabular-nums text-text-muted">{data.activity[index]}</span>
                <span
                  className="bar w-[min(2.4rem,80%)] min-h-1 rounded-t-[5px] bg-[#b45309] transition-[height] duration-200"
                  style={{ height: `${data.activity[index]}%` }}
                />
                <span className="whitespace-nowrap py-[0.35rem] font-mono text-[0.625rem] text-text-faint">{label}</span>
              </div>
            ))}
          </div>
        </FeaturePanel>

        <FeaturePanel title="Habit consistency" description="Sample follow-through by routine.">
          <div className="mt-4 flex flex-col gap-3">
            {initialHabits.map((habit) => (
              <div className="flex flex-col gap-1" key={habit.id}>
                <div className="mb-1 flex items-start justify-between gap-3 text-xs text-text-muted">
                  <span>{habit.name}</span>
                  <strong className="font-mono text-[0.6875rem] text-text">{habit.consistency ?? 100}%</strong>
                </div>
                <div className="h-[0.45rem] overflow-hidden rounded-pill bg-[#e2e8f0]" role="progressbar" aria-label={`${habit.name} consistency`} aria-valuenow={habit.consistency ?? 100} aria-valuemin={0} aria-valuemax={100}>
                  <span className="block h-full rounded-[inherit] bg-[#059669]" style={{ width: `${habit.consistency ?? 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </FeaturePanel>

        <FeaturePanel title="Weekly completion rate" description="Sample completion percentage over time.">
          <div className="flex min-h-[13rem] items-end justify-around gap-2 border-b border-border-strong bg-[length:100%_25%] bg-[linear-gradient(to_bottom,transparent_calc(25%_-_1px),var(--border)_25%,transparent_calc(25%_+_1px),transparent_calc(50%_-_1px),var(--border)_50%,transparent_calc(50%_+_1px),transparent_calc(75%_-_1px),var(--border)_75%,transparent_calc(75%_+_1px))] px-2 pt-4 [&_.bar]:bg-[#0284c7]" role="img" aria-label={`${period} completion rate chart`}>
            {data.labels.map((label, index) => (
              <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" key={label}>
                <span className="font-mono text-[0.625rem] tabular-nums text-text-muted">{data.completion[index]}%</span>
                <span
                  className="bar w-[min(2.4rem,80%)] min-h-1 rounded-t-[5px] bg-[#b45309] transition-[height] duration-200"
                  style={{ height: `${data.completion[index]}%` }}
                />
                <span className="whitespace-nowrap py-[0.35rem] font-mono text-[0.625rem] text-text-faint">{label}</span>
              </div>
            ))}
          </div>
        </FeaturePanel>

        <FeaturePanel title="Focus opportunities" description="A neutral prompt for reviewing neglected routines.">
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#fde68a] bg-[#fffbeb] text-[#b45309]">↗</span>
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
