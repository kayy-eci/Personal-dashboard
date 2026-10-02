import { useMemo, useState } from 'react'
import { initialActivity } from '../Dashboard/dashboard-data'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'

type EventFilter = 'all' | 'xp' | 'health'

const filters: { id: EventFilter; label: string }[] = [
  { id: 'all', label: 'All events' },
  { id: 'xp', label: 'XP & completions' },
  { id: 'health', label: 'Vitality' },
]

export function TimelinePage() {
  const [filter, setFilter] = useState<EventFilter>('all')
  const [search, setSearch] = useState('')
  const entries = useMemo(
    () =>
      initialActivity.filter((entry) => {
        const matchesType = filter === 'all' || entry.tone === filter
        const matchesSearch =
          `${entry.title} ${entry.detail} ${entry.reward}`.toLowerCase().includes(search.toLowerCase())
        return matchesType && matchesSearch
      }),
    [filter, search],
  )
  const xpEntries = initialActivity.filter((entry) => entry.tone === 'xp').length
  const healthEntries = initialActivity.filter((entry) => entry.tone === 'health').length

  return (
    <div className="feature-page feature-page__content">
      <DemoNotice>
        This sample feed is not a saved ledger. Only verified backend events can become permanent history.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Visible events', value: String(entries.length), note: 'Matching current filters', tone: 'violet' },
          { label: 'XP events', value: String(xpEntries), note: 'Completions and rewards', tone: 'sky' },
          { label: 'Vitality events', value: String(healthEntries), note: 'Health changes', tone: 'rose' },
          { label: 'Time range', value: 'Recent', note: 'Sample entries only', tone: 'amber' },
        ]}
      />

      <FeaturePanel
        title="Activity ledger"
        description="Habit check-ins, quest completions, XP rewards, and health updates."
      >
        <div className="feature-panel__toolbar">
          <input
            className="feature-search"
            type="search"
            placeholder="Search activity"
            aria-label="Search timeline events"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="feature-filter-group" role="group" aria-label="Filter timeline events">
            {filters.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="feature-empty" role="status">
            No events match this search and filter.
          </div>
        ) : (
          <ol className="feature-timeline">
            {entries.map((entry) => (
              <li
                className={`feature-timeline__event feature-timeline__event--${entry.tone}`}
                key={entry.id}
              >
                <div className="feature-timeline__meta">
                  <time>{entry.time}</time>
                  <span>{entry.reward}</span>
                </div>
                <h3>{entry.title}</h3>
                <p>{entry.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </FeaturePanel>
    </div>
  )
}
