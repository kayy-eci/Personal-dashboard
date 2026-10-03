import { useMemo } from 'react'
import { initialActivity } from '../Dashboard/dashboard-data'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'
import { usePersistentState } from '../../lib/storage'
import { rangeForPreset, inRange } from '../../lib/dates'
import { usePreferences } from '../../preferences/usePreferences'

type EventFilter = 'all' | 'xp' | 'health'
type DatePresetId = 'all' | 'today' | 'week' | 'month'
type TimelineSort = 'newest' | 'oldest' | 'reward'

const filters: { id: EventFilter; label: string }[] = [
  { id: 'all', label: 'All events' },
  { id: 'xp', label: 'XP & completions' },
  { id: 'health', label: 'Vitality' },
]

const datePresetMap: Record<DatePresetId, Parameters<typeof rangeForPreset>[0]> = {
  all: 'all',
  today: 'today',
  week: 'this-week',
  month: 'this-month',
}

function parseActivityTime(time: string): Date | null {
  const upper = time.toUpperCase()
  if (upper.includes('TODAY')) return new Date()
  if (upper.includes('YESTERDAY')) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  }
  const parsed = new Date(time)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseRewardValue(reward: string): number {
  const match = reward.match(/(-?\d[\d,]*)/)
  return match ? Number(match[1].replace(/,/g, '')) : 0
}

interface TimelinePrefs {
  filter: EventFilter
  search: string
  sort: TimelineSort
  preset: DatePresetId
}

export function TimelinePage() {
  const [prefs, setPrefs] = usePersistentState<TimelinePrefs>('timeline:prefs', {
    filter: 'all',
    search: '',
    sort: 'newest',
    preset: 'all',
  })
  const { filter, search, sort, preset } = prefs
  const { preferences } = usePreferences()
  const entries = useMemo(() => {
    const range = rangeForPreset(datePresetMap[preset] ?? 'all', new Date(), preferences.weekStart)
    const filtered = initialActivity.filter((entry) => {
      const matchesType = filter === 'all' || entry.tone === filter
      const matchesSearch =
        `${entry.title} ${entry.detail} ${entry.reward}`.toLowerCase().includes(search.toLowerCase())
      const parsed = parseActivityTime(entry.time)
      const matchesDate = preset === 'all' || (parsed !== null && inRange(parsed, range))
      return matchesType && matchesSearch && matchesDate
    })
    return [...filtered].sort((a, b) => {
      if (sort === 'reward') return parseRewardValue(b.reward) - parseRewardValue(a.reward)
      const timeA = parseActivityTime(a.time)?.getTime() ?? 0
      const timeB = parseActivityTime(b.time)?.getTime() ?? 0
      return sort === 'newest' ? timeB - timeA : timeA - timeB
    })
  }, [filter, preset, preferences.weekStart, search, sort])
  const xpEntries = initialActivity.filter((entry) => entry.tone === 'xp').length
  const healthEntries = initialActivity.filter((entry) => entry.tone === 'health').length

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 p-3 pb-5 min-[769px]:p-4 min-[769px]:pb-6">
      <DemoNotice>
        This sample feed is not a saved ledger. Only verified backend events can become permanent history.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Visible events', value: String(entries.length), note: 'Matching current filters', tone: 'gold' },
          { label: 'XP events', value: String(xpEntries), note: 'Completions and rewards', tone: 'sky' },
          { label: 'Vitality events', value: String(healthEntries), note: 'Health changes', tone: 'rose' },
          { label: 'Time range', value: 'Recent', note: 'Sample entries only', tone: 'ember' },
        ]}
      />

      <FeaturePanel
        title="Activity ledger"
        description="Habit check-ins, quest completions, XP rewards, and health updates."
      >
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <input
            className="min-h-9 flex-1 max-w-[24rem] rounded-md border border-border-strong bg-surface-overlay px-2.5 py-1.5 text-sm text-text placeholder:text-text-faint"
            type="search"
            placeholder="Search activity"
            aria-label="Search timeline events"
            value={search}
            onChange={(event) => setPrefs((current) => ({ ...current, search: event.target.value }))}
          />
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem] [&>button]:rounded [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-[0.55rem] [&>button]:py-[0.35rem] [&>button]:text-xs [&>button]:font-semibold [&>button]:text-text-muted hover:[&>button]:text-text [&>button[aria-pressed=true]]:border-border [&>button[aria-pressed=true]]:bg-surface-overlay [&>button[aria-pressed=true]]:text-text [&>button[aria-pressed=true]]:shadow-xs" role="group" aria-label="Filter timeline events">
            {filters.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                aria-pressed={filter === id}
                onClick={() => setPrefs((current) => ({ ...current, filter: id }))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem] [&>button]:rounded [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-[0.55rem] [&>button]:py-[0.35rem] [&>button]:text-xs [&>button]:font-semibold [&>button]:text-text-muted hover:[&>button]:text-text [&>button[aria-pressed=true]]:border-border [&>button[aria-pressed=true]]:bg-surface-overlay [&>button[aria-pressed=true]]:text-text [&>button[aria-pressed=true]]:shadow-xs" role="group" aria-label="Date range presets">
            {(['all', 'today', 'week', 'month'] as const).map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={preset === option}
                onClick={() => setPrefs((current) => ({ ...current, preset: option }))}
              >
                {option === 'all' ? 'All time' : option === 'today' ? 'Today' : option === 'week' ? 'This week' : 'This month'}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            Sort
            <select
              className="min-h-9 rounded-md border border-border-strong bg-surface-overlay px-2.5 py-1.5 text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
              aria-label="Sort timeline events"
              value={sort}
              onChange={(event) => setPrefs((current) => ({ ...current, sort: event.target.value as TimelineSort }))}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="reward">Reward value</option>
            </select>
          </label>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-sunken p-3 text-center text-sm text-text-muted" role="status">
            No events match this search and filter.
          </div>
        ) : (
          <ol className="relative mt-3 flex flex-col gap-3 pl-[1.25rem] before:absolute before:bottom-[0.5rem] before:left-[0.3rem] before:top-[0.5rem] before:w-0.5 before:bg-border-strong before:content-['']">
            {entries.map((entry) => (
              <li
                className={`${entry.tone === 'health' ? 'relative flex flex-col gap-1.5 rounded-lg border border-border bg-surface-sunken p-2.5 before:absolute before:left-[-1.3rem] before:top-4 before:h-[0.7rem] before:w-[0.7rem] before:rounded-full before:border-2 before:border-[#ffe4e6] before:bg-[#dc2626] before:content-[""]' : 'relative flex flex-col gap-1.5 rounded-lg border border-border bg-surface-sunken p-2.5 before:absolute before:left-[-1.3rem] before:top-4 before:h-[0.7rem] before:w-[0.7rem] before:rounded-full before:border-2 before:border-[#fdf3e0] before:bg-brand before:content-[""]'}`}
                key={entry.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[0.6875rem] text-text-faint">
                  <time>{entry.time}</time>
                  <span className={`${entry.tone === 'health' ? 'whitespace-nowrap rounded border border-[#fecdd3] bg-[#fff1f2] px-1.5 py-0.5 font-bold text-[#be123c]' : 'whitespace-nowrap rounded border border-[#a7f3d0] bg-[#ecfdf5] px-1.5 py-0.5 font-bold text-[#047857]'}`}>{entry.reward}</span>
                </div>
                <h3 className="text-sm font-bold text-text">{entry.title}</h3>
                <p className="text-sm leading-[1.5] text-text-muted">{entry.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </FeaturePanel>
    </div>
  )
}
