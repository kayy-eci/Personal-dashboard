import { useCallback, useEffect, useRef, useState } from 'react'
import { mockActivityYear } from '../components/activity-data'
import {
  blankActivityDays,
  buildWindowFromEvents,
  buildYearFromContributionWeeks,
  buildYearFromContributionsHtml,
  clearGitHubCacheFor,
  getStoredGitHubToken,
  getStoredGitHubUsername,
  readGitHubCache,
  setStoredGitHubToken,
  writeGitHubCache,
  GITHUB_CACHE_TTL_MS,
  GITHUB_HISTORY_DAYS,
  GITHUB_TOKEN_KEY,
  GITHUB_USERNAME_KEY,
  type GitHubActivitySource,
  type GitHubActivityStatus,
  type GitHubContributionsResponse,
  type GitHubEventItem,
} from './github-activity-utils'
import type { ActivityDay } from '../components/github-activity-grid'

const GRAPHQL_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`.trim()

/**
 * Live GitHub activity over a full-year window for the contribution grid.
 * Source priority (first success wins):
 * 1. Authenticated GraphQL (`graphql`) — exact counts incl. private, needs
 *    the PAT stored from Settings → Integrations.
 * 2. Public profile graph scrape (`contributions`) — full-year public data,
 *    no token, via a CORS proxy.
 * 3. Public events REST API (`events`) — recent ~90 days only.
 * Caches per-username for 15 min; on failure keeps stale cache or mock data.
 */
export function useGitHubActivity() {
  const [username, setUsernameState] = useState<string>(getStoredGitHubUsername)
  const [hasToken, setHasToken] = useState<boolean>(() => getStoredGitHubToken().length > 0)
  const [days, setDays] = useState<ActivityDay[]>(() => {
    const cached = typeof window !== 'undefined' ? readGitHubCache(getStoredGitHubUsername()) : null
    return cached?.days ?? blankActivityDays(GITHUB_HISTORY_DAYS)
  })
  const [source, setSource] = useState<GitHubActivitySource>(() => {
    if (typeof window === 'undefined') return null
    return readGitHubCache(getStoredGitHubUsername())?.source ?? null
  })
  const [status, setStatus] = useState<GitHubActivityStatus>(() =>
    typeof window !== 'undefined' && readGitHubCache(getStoredGitHubUsername()) ? 'cached' : 'loading',
  )
  const [error, setError] = useState<string | null>(null)
  const [isTodayCovered, setIsTodayCovered] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const requestId = useRef(0)
  // Ref mirror so the async loader sees token changes without retriggering.
  const hasTokenRef = useRef(hasToken)
  useEffect(() => {
    hasTokenRef.current = hasToken
  }, [hasToken])

  const setUsername = useCallback((next: string) => {
    const trimmed = next.trim()
    if (!trimmed) return
    setUsernameState(trimmed)
    try {
      window.localStorage.setItem(GITHUB_USERNAME_KEY, trimmed)
    } catch {
      // non-fatal — username still applies for the session
    }
  }, [])

  const setToken = useCallback(
    (token: string) => {
      const trimmed = token.trim()
      setStoredGitHubToken(trimmed)
      setHasToken(trimmed.length > 0)
      // Counts differ per source — drop the old cache so the grid refetches.
      clearGitHubCacheFor(username)
      setStatus('loading')
      setDays(blankActivityDays(GITHUB_HISTORY_DAYS))
      setSource(null)
      setRefreshTick((tick) => tick + 1)
    },
    [username],
  )

  const clearToken = useCallback(() => {
    setStoredGitHubToken('')
    setHasToken(false)
    clearGitHubCacheFor(username)
    setStatus('loading')
    setDays(blankActivityDays(GITHUB_HISTORY_DAYS))
    setSource(null)
    setRefreshTick((tick) => tick + 1)
  }, [username])

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (event.key === GITHUB_USERNAME_KEY) {
        if (event.newValue && event.newValue.trim()) setUsernameState(event.newValue.trim())
      } else if (event.key === GITHUB_TOKEN_KEY) {
        setHasToken((event.newValue ?? '').length > 0)
      }
    }
    window.addEventListener('storage', syncStorage)
    return () => window.removeEventListener('storage', syncStorage)
  }, [])

  useEffect(() => {
    const mine = ++requestId.current
    let cancelled = false

    const rememberTodayCoverage = (next: ActivityDay[], fromSource: Exclude<GitHubActivitySource, null>) => {
      if (cancelled || requestId.current !== mine) return
      setDays(next)
      setSource(fromSource)
      setStatus('live')
      const today = next[next.length - 1]
      setIsTodayCovered(fromSource === 'contributions' || fromSource === 'graphql' || (today?.count ?? 0) > 0)
    }

    async function loadFromGraphQL(): Promise<'ok' | 'skip' | 'fail'> {
      const token = getStoredGitHubToken()
      if (!token) return 'skip'
      try {
        const controller = new AbortController()
        const timer = window.setTimeout(() => controller.abort(), 15000)
        try {
          const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ query: GRAPHQL_QUERY, variables: { login: username } }),
          })
          if (response.status === 401) {
            throw new Error('GitHub token rejected (401). Check the PAT is valid and not expired.')
          }
          if (response.status === 403) {
            throw new Error('GitHub refused the token (403). It may lack access or be rate-limited.')
          }
          if (!response.ok) {
            throw new Error(`GitHub request failed (${response.status}).`)
          }
          const payload = (await response.json()) as GitHubContributionsResponse
          if (payload.errors?.length) {
            const message = payload.errors[0]?.message ?? 'GraphQL error'
            if (/not found/i.test(message)) throw new Error(`GitHub user "${username}" not found.`)
            throw new Error(`GitHub: ${message}`)
          }
          const weeks = payload.data?.user?.contributionsCollection?.contributionCalendar?.weeks
          const next = buildYearFromContributionWeeks(weeks, GITHUB_HISTORY_DAYS)
          if (!next) throw new Error('GitHub returned no contribution data.')
          writeGitHubCache(username, { days: next, fetchedAt: Date.now(), source: 'graphql' })
          rememberTodayCoverage(next, 'graphql')
          return 'ok'
        } finally {
          window.clearTimeout(timer)
        }
      } catch (err) {
        if (cancelled || requestId.current !== mine) return 'fail'
        const message = err instanceof Error ? err.message : 'Could not load GitHub activity.'
        // A bad token should be loud even with cache — otherwise users think
        // they're authenticated while seeing public data.
        if (/401|rejected|expired/i.test(message)) setError(message)
        else setError((prev) => prev ?? message)
        return 'fail'
      }
    }

    async function loadFromContributionsGraph(): Promise<boolean> {
      // CORS proxies are best-effort — try each in order, short timeout each.
      const target = `https://github.com/users/${encodeURIComponent(username)}/contributions`
      const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
      ]
      for (const url of proxies) {
        const controller = new AbortController()
        const timer = window.setTimeout(() => controller.abort(), 12000)
        try {
          const response = await fetch(url, { signal: controller.signal })
          if (!response.ok) continue
          const html = await response.text()
          const next = buildYearFromContributionsHtml(html, GITHUB_HISTORY_DAYS)
          if (!next) continue
          writeGitHubCache(username, { days: next, fetchedAt: Date.now(), source: 'contributions' })
          rememberTodayCoverage(next, 'contributions')
          return true
        } catch {
          continue
        } finally {
          window.clearTimeout(timer)
        }
      }
      return false
    }

    async function loadFromPublicEvents(cached: ReturnType<typeof readGitHubCache>): Promise<boolean> {
      try {
        const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
        if (cached?.etag && Date.now() - cached.fetchedAt < GITHUB_CACHE_TTL_MS * 4) {
          headers['If-None-Match'] = cached.etag
        }
        const response = await fetch(
          `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`,
          { headers },
        )

        if (response.status === 304 && cached) {
          writeGitHubCache(username, { ...cached, fetchedAt: Date.now(), source: 'events' })
          if (cancelled || requestId.current !== mine) return true
          setDays(cached.days)
          setSource('events')
          setStatus('live')
          return true
        }

        if (response.status === 404) {
          throw new Error(`GitHub user "${username}" not found.`)
        }
        if (response.status === 403) {
          const remaining = response.headers.get('X-RateLimit-Remaining')
          if (remaining === '0') {
            throw new Error('GitHub rate limit reached (60/hr). Showing cached data.')
          }
          throw new Error('GitHub refused the request (403).')
        }
        if (!response.ok) {
          throw new Error(`GitHub request failed (${response.status}).`)
        }

        const events = (await response.json()) as GitHubEventItem[]
        const next = buildWindowFromEvents(events, GITHUB_HISTORY_DAYS)
        writeGitHubCache(username, {
          days: next,
          fetchedAt: Date.now(),
          etag: response.headers.get('ETag') ?? undefined,
          source: 'events',
        })
        rememberTodayCoverage(next, 'events')
        return true
      } catch (err) {
        if (cancelled || requestId.current !== mine) return true
        const message = err instanceof Error ? err.message : 'Could not load GitHub activity.'
        // Only surface the error when there is nothing cached to show.
        if (!cached) setError(message)
        else setError((prev) => prev ?? message)
        return false
      }
    }

    async function load() {
      setError(null)
      const cached = readGitHubCache(username)
      // stale-while-revalidate: show cache instantly, refresh in background
      if (cached) {
        setDays(cached.days)
        setSource(cached.source ?? null)
        setStatus(Date.now() - cached.fetchedAt > GITHUB_CACHE_TTL_MS ? 'cached' : 'live')
      } else {
        setStatus('loading')
        setDays(blankActivityDays(GITHUB_HISTORY_DAYS))
      }

      // 0) Authenticated GraphQL (exact, incl. private). 1) Full-year
      // profile graph. 2) Recent public events. 3) Stale/mock.
      const gql = await loadFromGraphQL()
      if (gql === 'ok') return
      if (gql === 'fail' && hasTokenRef.current) {
        // Token present but broken — don't silently show public data as if
        // it were authenticated; surface the error and stop.
        if (cancelled || requestId.current !== mine) return
        if (cached) {
          setDays(cached.days)
          setSource(cached.source ?? null)
          setStatus('cached')
        } else {
          let seed = 7
          for (const ch of username.toLowerCase()) seed = (seed * 31 + ch.charCodeAt(0)) % 100000
          setDays(mockActivityYear(seed))
          setSource(null)
          setStatus('fallback')
        }
        return
      }
      if (await loadFromContributionsGraph()) return
      const eventsOk = await loadFromPublicEvents(cached)
      if (cancelled || requestId.current !== mine) return
      if (eventsOk) return
      if (cached) {
        setDays(cached.days)
        setSource(cached.source ?? null)
        setStatus('cached')
      } else {
        // Deterministic per-username mock so the grid still looks alive.
        let seed = 7
        for (const ch of username.toLowerCase()) seed = (seed * 31 + ch.charCodeAt(0)) % 100000
        setDays(mockActivityYear(seed))
        setSource(null)
        setStatus('fallback')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // hasToken read via ref; saving/clearing the token bumps refreshTick to
    // retrigger. `username`dep covers username changes.
  }, [username, refreshTick])

  return { username, setUsername, days, status, error, source, isTodayCovered, hasToken, setToken, clearToken }
}
