import { useId, useState, type ReactNode } from 'react'
import { QuestsIcon } from '../../components/icons/Icons'
import { filterAndSort, useSearch, type SortOption } from '../../hooks/useListControls'
import type { QuestItem } from './dashboard-data'

type QuestFilter = 'all' | QuestItem['category']

interface QuestSectionProps {
  quests: QuestItem[]
  completedIds: string[]
  recoveryClaimed: boolean
  onComplete: (quest: QuestItem) => void
  onClaimRecovery: (quest: QuestItem) => void
  selectedAttribute?: string | null
  /** Rendered at the end of the header — the section menu. */
  menu?: ReactNode
}

const filterLabels: Record<QuestFilter, string> = {
  all: 'All',
  main: 'Main',
  side: 'Side',
  challenge: 'Challenge',
  recovery: 'Recovery',
}

const categoryLabels: Record<QuestItem['category'], string> = {
  main: 'Main quest',
  side: 'Side quest',
  challenge: 'Challenge',
  recovery: 'Recovery quest',
}

function questCategoryTag(category: QuestItem['category']) {
  switch (category) {
    case 'main': return 'text-[var(--danger-text)] bg-[var(--danger-soft)] border-[var(--danger-border)]'
    case 'side': return 'text-[var(--info-text)] bg-[var(--info-soft)] border-[var(--info-border)]'
    case 'challenge': return 'text-[var(--warning-text)] bg-[var(--warning-soft)] border-[var(--warning-border)]'
    case 'recovery': return 'text-[var(--attr-focus)] bg-[var(--success-soft)] border-[var(--success-border)]'
  }
}

export function QuestSection({
  quests,
  completedIds,
  recoveryClaimed,
  onComplete,
  onClaimRecovery,
  selectedAttribute,
  menu,
}: QuestSectionProps) {
  const headingId = useId()
  const [filter, setFilter] = useState<QuestFilter>('all')
  const { query, setQuery } = useSearch()
  const [sortId, setSortId] = useState('reward-desc')
  const [hideCompleted, setHideCompleted] = useState(false)
  const activeCount = quests.filter(
    (quest) => !completedIds.includes(quest.id) && !(quest.category === 'recovery' && recoveryClaimed),
  ).length

  const questSortOptions: SortOption<QuestItem>[] = [
    { id: 'reward-desc', label: 'Reward (high to low)', compare: (a, b) => b.reward - a.reward },
    { id: 'reward-asc', label: 'Reward (low to high)', compare: (a, b) => a.reward - b.reward },
    { id: 'deadline', label: 'Deadline', compare: (a, b) => (a.deadline ?? '￿').localeCompare(b.deadline ?? '￿') },

    { id: 'difficulty', label: 'Difficulty', compare: (a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0) },
    { id: 'alpha', label: 'Alphabetical', compare: (a, b) => a.title.localeCompare(b.title) },
    { id: 'category', label: 'Category', compare: (a, b) => a.category.localeCompare(b.category) },
  ]

  const visibleQuests = filterAndSort(
    quests,
    query,
    (quest) => [quest.title, quest.description, quest.category, quest.linkedGoal],
    [
      (quest) => filter === 'all' || quest.category === filter,
      (quest) => !hideCompleted || !(completedIds.includes(quest.id) || (quest.category === 'recovery' && recoveryClaimed)),
      (quest) =>
        !selectedAttribute ||
        quest.attributeRewards.some((reward) => reward.toUpperCase().includes(selectedAttribute.toUpperCase())),
    ],
    sortId,
    questSortOptions,
  )

  return (
    <section className="group/section min-w-0 rounded-xl border border-border bg-surface p-[var(--section-pad)] shadow-xs scroll-mt-4" id="quests" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--info-text)]">
            <QuestsIcon className="h-[1.1rem] w-[1.1rem]" />
          </span>
          <div>
            <h2 className="text-lg font-bold leading-[1.3] text-text" id={headingId}>
              Active Quests &amp; Directives
            </h2>
            <p className="mt-0.5 text-xs leading-[1.45] text-text-muted">
              Rewards are previews until a verified activity ledger is connected.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-surface-sunken px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-text-muted">{activeCount} active</span>
        {menu}
      </div>

      <div className="mt-2.5 flex w-fit max-w-full flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem]" role="group" aria-label="Filter quests">
        {(Object.keys(filterLabels) as QuestFilter[]).map((category) => {
          const count =
            category === 'all'
              ? quests.length
              : quests.filter((quest) => quest.category === category).length

          return (
            <button
              type="button"
              key={category}
              className={`rounded border px-2 py-[0.3rem] text-xs font-semibold transition-colors ${filter === category ? 'border-border bg-surface text-text shadow-xs' : 'border-transparent bg-transparent text-text-muted hover:text-text'}`}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {filterLabels[category]} <span className="text-text-faint">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <input
          className="min-h-[var(--control-h)] flex-1 max-w-[20rem] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text placeholder:text-text-faint"
          type="search"
          placeholder="Search quests"
          aria-label="Search quests"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
          Sort
          <select
            className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text"
            value={sortId}
            onChange={(event) => setSortId(event.target.value)}
          >
            {questSortOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`min-h-[var(--control-h)] rounded-md border px-[var(--pad-x)] py-[var(--pad-y)] text-xs font-bold uppercase tracking-[0.035em] transition-colors ${hideCompleted ? 'border-brand bg-brand text-brand-contrast' : 'border-border-strong bg-surface text-text-muted hover:bg-surface-sunken hover:text-text'}`}
          aria-pressed={hideCompleted}
          onClick={() => setHideCompleted((current) => !current)}
        >
          Hide completed
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2.5">
        {visibleQuests.map((quest) => {
          const isComplete =
            completedIds.includes(quest.id) ||
            (quest.category === 'recovery' && recoveryClaimed)

          return (
            <article
              className={`min-w-0 rounded-[10px] border border-border bg-surface-sunken p-2.5 transition-colors hover:border-[var(--warning-border)] ${quest.category === 'recovery' ? 'border-l-4 border-l-[var(--info)]' : ''}`}
              key={quest.id}
              id={quest.category === 'recovery' ? 'recovery-quest' : undefined}
            >
              <div className="flex items-start justify-between gap-2 max-[600px]:flex-col">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-[0.35rem]">
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold leading-[1.3] ${questCategoryTag(quest.category)}`}>
                      {categoryLabels[quest.category]}
                    </span>
                    {quest.linkedGoal && <span className="inline-flex items-center rounded border border-[var(--attr-border)] bg-[var(--attr-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--text-muted)]">Linked: {quest.linkedGoal}</span>}
                    {quest.deadline && <span className="inline-flex items-center rounded border border-[var(--attr-border)] bg-[var(--attr-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--text-muted)]">{quest.deadline}</span>}
                    {quest.category === 'recovery' && (
                      <span className="inline-flex items-center rounded border border-[var(--warning-border)] bg-[var(--warning-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--warning-text)]">Daily limit: {recoveryClaimed ? '2/2' : '1/2'} used</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold leading-[1.4] text-text">{quest.title}</h3>
                  <p className="mt-1 text-sm leading-[1.5] text-text-muted">{quest.description}</p>
                </div>

                {quest.category === 'recovery' ? (
                  <button
                    type="button"
                    className="min-h-[var(--control-h)] shrink-0 rounded-md border border-[var(--success-border)] bg-[var(--success-soft)] px-[0.7rem] py-2 text-[0.65rem] font-bold uppercase tracking-[0.03em] text-[var(--attr-focus)] transition-colors hover:bg-[var(--success-soft)] disabled:cursor-default disabled:border-[var(--success-border)] disabled:bg-[var(--success-soft)] disabled:text-[var(--success-text)] max-[600px]:self-start"
                    onClick={() => onClaimRecovery(quest)}
                    disabled={recoveryClaimed}
                  >
                    {recoveryClaimed ? 'Restored' : `Claim +${quest.reward} HP`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`min-h-[var(--control-h)] shrink-0 rounded-md border px-[0.7rem] py-2 text-[0.65rem] font-bold uppercase tracking-[0.03em] transition-colors max-[600px]:self-start ${isComplete ? 'cursor-default border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-text)]' : 'border-brand bg-brand text-brand-contrast hover:bg-brand-hover hover:border-brand-hover'}`}
                    onClick={() => onComplete(quest)}
                    disabled={isComplete}
                  >
                    {isComplete ? 'Completed' : 'Complete quest'}
                  </button>
                )}
              </div>

              {quest.category === 'recovery' ? (
                <div className="mt-2.5 flex flex-wrap justify-between gap-2 border-t border-border pt-2.5 text-xs font-semibold text-[var(--attr-focus)] [&>span]:font-normal [&>span]:text-text-faint">
                  Restores {quest.reward} vitality points <span>Cooldown resets at 00:00</span>
                </div>
              ) : (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                  <div className="flex flex-wrap items-center gap-[0.35rem] font-mono text-[0.65rem] text-text-faint [&>span]:rounded border [&>span]:border-border [&>span]:bg-surface [&>span]:px-1.5 [&>span]:py-0.5 [&>span]:text-text-muted">
                    <span>Base: {quest.baseReward}</span>
                    <span aria-hidden="true">×</span>
                    <span>Diff: {quest.difficulty}</span>
                    <span aria-hidden="true">×</span>
                    <span>Effort: {quest.effort}</span>
                    <span aria-hidden="true">×</span>
                    <span>Impact: {quest.impact ?? 1}</span>
                    <strong className="text-[var(--success-text)]">= +{quest.reward} XP</strong>
                  </div>
                  <div className="flex flex-wrap items-center gap-[0.35rem]">
                    {quest.attributeRewards.map((reward) => (
                      <span className="inline-flex items-center rounded border border-[var(--info-border)] bg-[var(--info-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--info-text)]" key={reward}>{reward}</span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )
        })}
        {visibleQuests.length === 0 && (
          <p className="text-xs text-text-muted">No quests match the current filters.</p>
        )}
      </div>
    </section>
  )
}
