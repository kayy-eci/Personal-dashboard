import { useId } from 'react'
import { GoalsIcon, TimelineIcon } from '../../components/icons/Icons'
import { initialGoals, type ActivityEntry } from './dashboard-data'

interface GoalsAndTimelineProps {
  activity: ActivityEntry[]
}

function goalColor(tone: string) {
  return tone === 'gold' ? '#b45309' : tone === 'rose' ? '#e11d48' : '#0369a1'
}

function goalSoft(tone: string) {
  return tone === 'gold' ? '#fdf3e0' : tone === 'rose' ? '#ffe4e6' : '#e0f2fe'
}

function goalPercentColor(tone: string) {
  return tone === 'gold' ? 'text-brand' : tone === 'rose' ? 'text-[#e11d48]' : 'text-[#0369a1]'
}

function goalTone(tone: string) {
  return tone === 'gold'
    ? 'border-l-4 border-l-brand'
    : tone === 'rose'
      ? 'border-l-4 border-l-[#e11d48]'
      : 'border-l-4 border-l-[#0369a1]'
}

export function GoalsAndTimeline({ activity }: GoalsAndTimelineProps) {
  const goalsHeadingId = useId()
  const timelineHeadingId = useId()

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-xs" aria-labelledby={goalsHeadingId}>
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#fde68a] bg-[#fffbeb] text-[#b45309]">
              <GoalsIcon className="h-[1.1rem] w-[1.1rem]" />
            </span>
            <h2 className="text-lg font-bold leading-[1.3] text-text" id={goalsHeadingId}>
              Long-term trajectories
            </h2>
          </div>
          <span className="shrink-0 rounded-md bg-surface-sunken px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-text-muted">3 active</span>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {initialGoals.map((goal) => (
            <article className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-[10px] border border-border bg-surface-sunken p-3 ${goalTone(goal.tone)}`} key={goal.title}>
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-[1.4] text-text">{goal.title}</h3>
                <p className="mt-1 font-mono text-[0.65rem] text-text-muted">{goal.target}</p>
              </div>
              <span className={`font-mono text-sm font-bold ${goalPercentColor(goal.tone)}`}>{goal.progress}%</span>
              <div
                className="col-span-full h-[0.45rem] overflow-hidden rounded-pill"
                style={{ backgroundColor: goalSoft(goal.tone) }}
                role="progressbar"
                aria-label={goal.title}
                aria-valuenow={goal.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${goal.progress}% complete`}
              >
                <span className="block h-full rounded-[inherit]" style={{ width: `${goal.progress}%`, backgroundColor: goalColor(goal.tone) }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-xs" aria-labelledby={timelineHeadingId}>
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1]">
              <TimelineIcon className="h-[1.1rem] w-[1.1rem]" />
            </span>
            <h2 className="text-lg font-bold leading-[1.3] text-text" id={timelineHeadingId}>
              Telemetry ledger
            </h2>
          </div>
          <span className="inline-flex items-center gap-[0.35rem] whitespace-nowrap font-mono text-[0.65rem] font-bold text-[#047857]"><span className="h-[0.45rem] w-[0.45rem] rounded-full bg-[#10b981]" /> Demo feed</span>
        </div>

        <ol className="relative mt-4 flex flex-col gap-4 pl-[1.15rem] before:absolute before:bottom-[0.35rem] before:left-[0.3rem] before:top-[0.35rem] before:w-0.5 before:bg-border-strong before:content-['']">
          {activity.map((entry) => (
            <li className={`relative before:absolute before:left-[-1.15rem] before:top-1 before:h-[0.65rem] before:w-[0.65rem] before:rounded-full before:border-2 before:content-[''] ${entry.tone === 'health' ? 'before:border-[#ffe4e6] before:bg-[#dc2626]' : 'before:border-[#fdf3e0] before:bg-brand'}`} key={entry.id}>
              <div className="flex items-center justify-between gap-2 font-mono text-[0.625rem] text-text-faint">
                <time>{entry.time}</time>
                <span className={`whitespace-nowrap rounded border px-1.5 py-0.5 font-bold ${entry.tone === 'health' ? 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]' : 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]'}`}>{entry.reward}</span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-[1.4] text-text">{entry.title}</p>
              <p className="mt-2 rounded-md border border-border bg-surface-sunken p-2 font-mono text-[0.65rem] leading-[1.5] text-text-muted">{entry.detail}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[0.6875rem] leading-[1.5] text-text-faint">
          Sample activity shown for layout preview; this feed is not a saved ledger.
        </p>
      </section>
    </div>
  )
}
