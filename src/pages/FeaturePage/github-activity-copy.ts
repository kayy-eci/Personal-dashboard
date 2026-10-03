import type { GitHubActivityStatus } from '../../hooks/github-activity-utils'
import type { GitHubActivitySource } from '../../hooks/github-activity-utils'

export function getActivityCopy(
  username: string,
  status: GitHubActivityStatus,
  source: GitHubActivitySource,
  hasToken: boolean,
): { periodLabel: string; description: string } {
  const atUser = `@${username}`
  const coverage =
    source === 'graphql'
      ? `exact contributions${hasToken ? ' (incl. private)' : ''}`
      : source === 'contributions'
        ? 'full-year public contributions'
        : source === 'events'
          ? 'recent public events (older months empty)'
          : 'full-year contributions'

  if (status === 'live') {
    return {
      periodLabel: `in the last year · ${atUser}`,
      description: `Live ${coverage} for ${atUser}. Today is ringed in accent.`,
    }
  }
  if (status === 'cached') {
    return {
      periodLabel: `in the last year · ${atUser} · cached`,
      description: `Showing cached ${coverage} for ${atUser} while fresh data loads. Today is ringed in accent.`,
    }
  }
  if (status === 'fallback') {
    return {
      periodLabel: `in the last year · ${atUser} · sample`,
      description: `Could not reach GitHub — showing sample data for ${atUser}. Today is ringed in accent.`,
    }
  }
  return {
    periodLabel: `in the last year · ${atUser} · loading…`,
    description: `Loading full-year contributions for ${atUser}… Today is ringed in accent.`,
  }
}
