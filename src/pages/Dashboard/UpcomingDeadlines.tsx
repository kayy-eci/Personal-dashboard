import { useId } from 'react'
import { TimelineIcon } from '../../components/icons/Icons'
import type { QuestItem } from './dashboard-data'

export interface UpcomingDeadlinesProps {
  quests: QuestItem[]
  /** Rendered at the end of the header — the section menu. */
  menu?: React.ReactNode
}

function urgencyColor(deadline: string): string {
  if (/today/i.test(deadline)) return 'text-danger-text'
  if (/remaining|hour/i.test(deadline)) return 'text-warning-text'
  return 'text-text-muted'
}

/**
 * Upcoming deadlines, assembled from the deadlines already carried by quests.
 *
 * Lives in the registry as `deadlines` so it can be hidden and restored like
 * every other Dashboard section.
 */
export function UpcomingDeadlines({ quests, menu }: UpcomingDeadlinesProps) {
  const headingId = useId()
  const dated = quests
    .filter((quest) => quest.deadline)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))

  return (
    <section
      className="group/section min-w-0 rounded-xl border border-border bg-surface p-3 shadow-xs"
      aria-labelledby={headingId}
    >
      <div className="flex items-center justify-between gap-2.5 border-b border-border pb-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-warning-border bg-warning-soft text-warning-text">
            <TimelineIcon className="h-[1.1rem] w-[1.1rem]" />
          </span>
          <h2 className="text-lg font-bold leading-[1.3] text-text" id={headingId}>
            Upcoming deadlines
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 rounded-md bg-surface-sunken px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-text-muted">
            {dated.length} dated
          </span>
          {menu}
        </div>
      </div>

      {dated.length === 0 ? (
        <p className="mt-2.5 text-xs text-text-muted">No quests carry a deadline.</p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-1.5" role="list">
          {dated.map((quest) => (
            <li
              key={quest.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-border bg-surface-sunken px-2.5 py-2"
            >
              <a
                href="#quests"
                className="min-w-0 flex-1 truncate text-sm font-semibold text-text no-underline hover:underline"
              >
                {quest.title}
              </a>
              <span
                className={`whitespace-nowrap rounded-[5px] border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.65rem] font-bold ${urgencyColor(quest.deadline ?? '')}`}
              >
                {quest.deadline}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
