import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlayerStatus } from '../../features/player/usePlayerStatus'
import {
  initialActivity,
  initialGoals,
  initialHabits,
  initialQuests,
} from '../../pages/Dashboard/dashboard-data'

interface SearchHit {
  group: 'Quests' | 'Habits' | 'Goals' | 'Activity' | 'Attributes'
  title: string
  detail: string
  page: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const status = usePlayerStatus()

  const openSearch = () => {
    setQuery('')
    setActiveIndex(0)
    setOpen(true)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (open) setOpen(false)
        else openSearch()
      }
    }
    const onOpen = () => openSearch()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('lifeos:open-search', onOpen)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('lifeos:open-search', onOpen)
    }
  }, [open])

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const index = useMemo<SearchHit[]>(() => {
    const quests: SearchHit[] = initialQuests.map((q) => ({
      group: 'Quests',
      title: q.title,
      detail: `${q.category} · +${q.reward} ${q.rewardType}${q.linkedGoal ? ` · ${q.linkedGoal}` : ''}`,
      page: 'quests',
    }))
    const habits: SearchHit[] = initialHabits.map((h) => ({
      group: 'Habits',
      title: h.name,
      detail: `${h.difficulty} · ${h.streak} day streak · +${h.reward} ${h.rewardType}`,
      page: 'habits',
    }))
    const goals: SearchHit[] = initialGoals.map((g) => ({
      group: 'Goals',
      title: g.title,
      detail: g.target,
      page: 'goals',
    }))
    const activity: SearchHit[] = initialActivity.map((a) => ({
      group: 'Activity',
      title: a.title,
      detail: `${a.time} · ${a.reward}`,
      page: 'timeline',
    }))
    const attributes: SearchHit[] = status.attributes.map((a) => ({
      group: 'Attributes',
      title: `${a.label} (Lv ${a.level})`,
      detail: `${a.xp} XP · ${a.xpToNextLevel} to next level`,
      page: 'attributes',
    }))
    return [...quests, ...habits, ...goals, ...activity, ...attributes]
  }, [status])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return index.slice(0, 8)
    return index
      .filter((hit) => `${hit.title} ${hit.detail} ${hit.group}`.toLowerCase().includes(q))
      .slice(0, 12)
  }, [index, query])

  const go = (hit: SearchHit) => {
    window.location.hash = `#/${hit.page}`
    setOpen(false)
  }

  const onResultKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault()
      go(results[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-start bg-scrim/60 p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[34rem] rounded-lg border border-border bg-surface-overlay p-3 shadow-md"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="search"
          className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text placeholder:text-text-faint"
          placeholder="Search quests, habits, goals, activity, attributes…"
          aria-label="Global search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={onResultKeyDown}
        />
        <ul className="mt-2 max-h-[50vh] overflow-y-auto" role="listbox" aria-label="Search results">
          {results.length === 0 && (
            <li className="rounded-md border border-dashed border-border-strong p-3 text-center text-sm text-text-muted" role="status">
              No matches for “{query}”.
            </li>
          )}
          {results.map((hit, index) => (
            <li key={`${hit.group}-${hit.title}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left ${index === activeIndex ? 'bg-surface-sunken' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => go(hit)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text">{hit.title}</span>
                  <span className="block truncate text-xs text-text-muted">{hit.detail}</span>
                </span>
                <span className="shrink-0 rounded-[5px] border border-border bg-surface px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-text-muted">
                  {hit.group}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[0.65rem] text-text-faint">↑↓ navigate · Enter open · Esc close</p>
      </div>
    </div>
  )
}
