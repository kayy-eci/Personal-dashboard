import type { ActivityDay } from '../components/github-activity-grid'

export const GITHUB_USERNAME_KEY = 'lifeos-github-username'
export const GITHUB_TOKEN_KEY = 'lifeos-github-token'
export const GITHUB_CACHE_KEY = 'lifeos-github-activity-cache:v3'
export const DEFAULT_GITHUB_USERNAME = 'kayy-eci'
// Full-year window (53 weeks ≈ 371 days) matching GitHub's contribution
// graph. Live sources fill what they can: the authenticated GraphQL API or
// the profile scrape covers the whole year, the public-events API ~90 days.
export const GITHUB_HISTORY_DAYS = 371
export const GITHUB_CACHE_TTL_MS = 15 * 60 * 1000

export type GitHubActivityStatus = 'loading' | 'live' | 'cached' | 'fallback'

export type GitHubActivitySource = 'graphql' | 'contributions' | 'events' | null

export interface GitHubCacheEntry {
  days: ActivityDay[]
  fetchedAt: number
  etag?: string
  /** Where the day counts came from — drives the UI coverage note. */
  source?: Exclude<GitHubActivitySource, null>
}

export interface GitHubEventItem {
  type?: string
  created_at?: string
  payload?: {
    commits?: unknown[]
  }
}

export function githubDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function blankActivityDays(total: number): ActivityDay[] {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const days: ActivityDay[] = []
  for (let index = total - 1; index >= 0; index--) {
    const date = new Date(end)
    date.setDate(end.getDate() - index)
    days.push({ date: githubDateKey(date), count: 0 })
  }
  return days
}

export function getStoredGitHubUsername(): string {
  if (typeof window === 'undefined') return DEFAULT_GITHUB_USERNAME
  try {
    const stored = window.localStorage.getItem(GITHUB_USERNAME_KEY)
    if (stored && stored.trim()) return stored.trim()
  } catch {
    // storage unavailable — fall back to default
  }
  return DEFAULT_GITHUB_USERNAME
}

/**
 * Personal Access Token for the authenticated path. Stored in localStorage
 * (per the hobby-project tradeoff: convenient, but any script on the page
 * could read it — use a token with no scopes beyond `read:user`).
 */
export function getStoredGitHubToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(GITHUB_TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setStoredGitHubToken(token: string) {
  try {
    if (token) window.localStorage.setItem(GITHUB_TOKEN_KEY, token)
    else window.localStorage.removeItem(GITHUB_TOKEN_KEY)
  } catch {
    // non-fatal — token still applies for the session via state
  }
}

export function clearGitHubCacheFor(username: string) {
  try {
    window.localStorage.removeItem(`${GITHUB_CACHE_KEY}:${username.toLowerCase()}`)
  } catch {
    // best-effort
  }
}

export function readGitHubCache(username: string): GitHubCacheEntry | null {
  try {
    const raw = window.localStorage.getItem(`${GITHUB_CACHE_KEY}:${username.toLowerCase()}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GitHubCacheEntry
    if (!Array.isArray(parsed.days) || typeof parsed.fetchedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function writeGitHubCache(username: string, entry: GitHubCacheEntry) {
  try {
    window.localStorage.setItem(`${GITHUB_CACHE_KEY}:${username.toLowerCase()}`, JSON.stringify(entry))
  } catch {
    // cache is best-effort (quota / private mode) — live data still renders
  }
}

/** Weight events so PRs / issues count alongside raw push volume. */
export function githubEventWeight(event: GitHubEventItem): number {
  switch (event.type) {
    case 'PushEvent': {
      const commits = Array.isArray(event.payload?.commits) ? event.payload.commits.length : 0
      return Math.max(1, commits)
    }
    case 'PullRequestEvent':
      return 4
    case 'PullRequestReviewEvent':
    case 'PullRequestReviewCommentEvent':
      return 2
    case 'IssuesEvent':
    case 'IssueCommentEvent':
      return 2
    default:
      return 1
  }
}

function parseContributionCount(tooltip: string): number | null {
  const match = tooltip.match(/(\d[\d,]*)\s+contribution/i)
  if (!match) return null
  const value = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(value) ? value : null
}

/**
 * Parse a GitHub profile contributions SVG/HTML fragment into day counts.
 * Real graph cells carry `data-date="YYYY-MM-DD"` plus either
 * `data-count` or a tooltip like "5 contributions on Oct 2nd".
 */
export function parseContributionsHtml(html: string): Map<string, number> | null {
  const byDay = new Map<string, number>()
  const cellPattern = /data-date="(\d{4}-\d{2}-\d{2})"[^<>]*(?:data-count="(\d+)"|data-level="(\d+)"|>([^<>]*?contribution[^<>]*?)<)/gi
  let match: RegExpExecArray | null
  while ((match = cellPattern.exec(html)) !== null) {
    const date = match[1]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    let count: number | null = null
    if (match[2] !== undefined) {
      count = Number(match[2])
    } else if (match[4]) {
      count = parseContributionCount(match[4])
    } else if (match[3] !== undefined) {
      // Level without a count — preserve the bucket so the cell shades.
      count = Number(match[3]) > 0 ? 1 : 0
    }
    if (count === null || !Number.isFinite(count)) continue
    byDay.set(date, Math.max(byDay.get(date) ?? 0, count))
  }
  return byDay.size > 0 ? byDay : null
}

function buildYearWindow(byDay: Map<string, number>, totalDays: number): ActivityDay[] {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const days: ActivityDay[] = []
  for (let index = totalDays - 1; index >= 0; index--) {
    const date = new Date(end)
    date.setDate(end.getDate() - index)
    const key = githubDateKey(date)
    days.push({ date: key, count: byDay.get(key) ?? 0 })
  }
  return days
}

/** Full-year day counts scraped from the public profile graph (no token). */
export function buildYearFromContributionsHtml(html: string, totalDays: number): ActivityDay[] | null {
  const byDay = parseContributionsHtml(html)
  if (!byDay) return null
  return buildYearWindow(byDay, totalDays)
}

export interface GitHubContributionWeek {
  contributionDays?: Array<{ date?: string; contributionCount?: number }>
}

export interface GitHubContributionsResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: GitHubContributionWeek[]
        }
      }
    }
  }
  errors?: Array<{ message?: string }>
}

/** Exact per-day counts (incl. private) from the GraphQL contributions API. */
export function buildYearFromContributionWeeks(
  weeks: GitHubContributionWeek[] | undefined,
  totalDays: number,
): ActivityDay[] | null {
  if (!weeks || weeks.length === 0) return null
  const byDay = new Map<string, number>()
  for (const week of weeks) {
    for (const day of week.contributionDays ?? []) {
      if (!day.date || typeof day.contributionCount !== 'number') continue
      byDay.set(day.date.slice(0, 10), day.contributionCount)
    }
  }
  if (byDay.size === 0) return null
  return buildYearWindow(byDay, totalDays)
}

/** Trailing-window day counts from public REST events (fallback source). */
export function buildWindowFromEvents(
  events: GitHubEventItem[],
  totalDays: number,
): ActivityDay[] {
  const byDay = new Map<string, number>()
  for (const event of events) {
    if (!event.created_at) continue
    const key = event.created_at.slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + githubEventWeight(event))
  }
  return buildYearWindow(byDay, totalDays)
}

