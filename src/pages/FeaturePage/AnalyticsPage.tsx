import { useEffect, useState } from 'react'
import { usePlayerStatus } from '../../features/player/usePlayerStatus'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'
import { usePersistentState } from '../../lib/storage'
import { getAnalytics, subscribe } from '../../data'

type Period = '7d' | '30d' | '90d'

const RANGE_DAYS: Record<Period, 7 | 30 | 90> = { '7d': 7, '30d': 30, '90d': 90 }

interface AnalyticsSummary {
  labels: string[]
  activity: number[]
  completion: number[]
  xpTotal: number
  habits: { name: string; consistency: number | null }[]
  daysOfData: number
}

export function AnalyticsPage() {
  const status = usePlayerStatus()
  const [period, setPeriod] = usePersistentState<Period>('analytics:period', '7d')
  const [data, setData] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const summary = await getAnalytics(RANGE_DAYS[period])
      if (!cancelled) setData(summary)
    }
    const id = setTimeout(() => void load(), 0)
    const unsub = subscribe('data', () => void load())
    return () => {
      cancelled = true
      clearTimeout(id)
      unsub()
    }
  }, [period])

  const habits = data?.habits ?? []
  const averageConsistency = habits.length
    ? Math.round(habits.reduce((sum, h) => sum + (h.consistency ?? 0), 0) / habits.length)
    : 0
  const topAttribute = [...status.attributes].sort((a, b) => b.xp - a.xp)[0]
  const leastConsistent = [...habits].sort((a, b) => (a.consistency ?? 100) - (b.consistency ?? 100))[0]

  const exportCsv = () => {
    if (!data) return
    const rows = [['label', 'activity', 'completion']]
    data.labels.forEach((label, index) => {
      rows.push([label, String(data.activity[index]), String(data.completion[index])])
    })
    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-${period}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 p-3 pb-5 min-[769px]:p-4 min-[769px]:pb-6">
      <DemoNotice>
        Analytics are computed from your saved ledger, habit logs and quest history in this browser.
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
          { label: 'XP earned', value: (data?.xpTotal ?? 0).toLocaleString(), note: `During the last ${period}`, tone: 'gold' },
          { label: 'Active streak', value: `${status.currentStreak} days`, note: 'Current streak', tone: 'ember' },
          { label: 'Top attribute', value: topAttribute.key, note: `${topAttribute.xp.toLocaleString()} ${topAttribute.label} XP`, tone: 'sky' },
        ]}
      />
      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60"
          onClick={exportCsv}
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-2">
        <FeaturePanel title="Activity by day" description="XP earned per day (capped display scale).">
          <div className="flex min-h-[10rem] items-end justify-around gap-1.5 border-b border-border-strong bg-[length:100%_25%] bg-[linear-gradient(to_bottom,transparent_calc(25%_-_1px),var(--border)_25%,transparent_calc(25%_+_1px),transparent_calc(50%_-_1px),var(--border)_50%,transparent_calc(50%_+_1px),transparent_calc(75%_-_1px),var(--border)_75%,transparent_calc(75%_+_1px))] px-2 pt-3" role="img" aria-label={`${period} activity chart`}>
            {(data?.labels ?? []).map((label, index) => (
              <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" key={label}>
                <span className="font-mono text-[0.625rem] tabular-nums text-text-muted">{data?.activity[index] ?? 0}</span>
                <span
                  className="bar w-[min(2.4rem,80%)] min-h-1 rounded-t-[5px] bg-[var(--warning-soft)] transition-[height] duration-200"
                  style={{ height: `${data?.activity[index] ?? 0}%` }}
                />
                <span className="whitespace-nowrap py-[0.35rem] font-mono text-[0.625rem] text-text-faint">{label}</span>
              </div>
            ))}
          </div>
        </FeaturePanel>

        <FeaturePanel title="Habit consistency" description="Follow-through by routine.">
          <div className="mt-4 flex flex-col gap-3">
            {habits.map((habit) => (
              <div className="flex flex-col gap-1" key={habit.name}>
                <div className="mb-1 flex items-start justify-between gap-3 text-xs text-text-muted">
                  <span>{habit.name}</span>
                  <strong className="font-mono text-[0.6875rem] text-text">{habit.consistency ?? 0}%</strong>
                </div>
                <div className="h-[0.45rem] overflow-hidden rounded-pill bg-[var(--attr-soft)]" role="progressbar" aria-label={`${habit.name} consistency`} aria-valuenow={habit.consistency ?? 0} aria-valuemin={0} aria-valuemax={100}>
                  <span className="block h-full rounded-[inherit] bg-[var(--success)]" style={{ width: `${habit.consistency ?? 0}%` }} />
                </div>
              </div>
            ))}
            {habits.length === 0 && <p className="text-xs text-text-muted">No active habits yet.</p>}
          </div>
        </FeaturePanel>

        <FeaturePanel title="Daily completion rate" description="Share of scheduled daily habits completed.">
          <div className="flex min-h-[10rem] items-end justify-around gap-1.5 border-b border-border-strong bg-[length:100%_25%] bg-[linear-gradient(to_bottom,transparent_calc(25%_-_1px),var(--border)_25%,transparent_calc(25%_+_1px),transparent_calc(50%_-_1px),var(--border)_50%,transparent_calc(50%_+_1px),transparent_calc(75%_-_1px),var(--border)_75%,transparent_calc(75%_+_1px))] px-2 pt-3 [&_.bar]:bg-[var(--info-soft)]" role="img" aria-label={`${period} completion rate chart`}>
            {(data?.labels ?? []).map((label, index) => (
              <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" key={label}>
                <span className="font-mono text-[0.625rem] tabular-nums text-text-muted">{data?.completion[index] ?? 0}%</span>
                <span
                  className="bar w-[min(2.4rem,80%)] min-h-1 rounded-t-[5px] bg-[var(--warning-soft)] transition-[height] duration-200"
                  style={{ height: `${data?.completion[index] ?? 0}%` }}
                />
                <span className="whitespace-nowrap py-[0.35rem] font-mono text-[0.625rem] text-text-faint">{label}</span>
              </div>
            ))}
          </div>
        </FeaturePanel>

        <FeaturePanel title="Focus opportunities" description="A neutral prompt for reviewing neglected routines.">
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-soft)] p-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)]">↗</span>
            <div>
              <h3>Review the least consistent routine</h3>
              <p>
                {leastConsistent
                  ? `Your data suggests protecting time for ${leastConsistent.name.toLowerCase()}. Small adjustments can make a routine easier to repeat.`
                  : 'Complete a few habits to see focus opportunities here.'}
              </p>
            </div>
          </div>
        </FeaturePanel>
      </div>
    </div>
  )
}
