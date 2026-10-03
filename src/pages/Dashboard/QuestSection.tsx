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
    case 'main': return 'text-[#be123c] bg-[#fff1f2] border-[#fecdd3]'
    case 'side': return 'text-[#0369a1] bg-[#f0f9ff] border-[#bae6fd]'
    case 'challenge': return 'text-[#b45309] bg-[#fffbeb] border-[#fde68a]'
    case 'recovery': return 'text-[#0f766e] bg-[#f0fdfa] border-[#99f6e4]'
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
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1]">
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
          className="min-h-9 flex-1 max-w-[20rem] rounded-md border border-border-strong bg-surface-overlay px-2.5 py-1.5 text-sm text-text placeholder:text-text-faint"
          type="search"
          placeholder="Search quests"
          aria-label="Search quests"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
          Sort
          <select
            className="min-h-9 rounded-md border border-border-strong bg-surface-overlay px-2.5 py-1.5 text-sm text-text"
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
          className={`min-h-9 rounded-md border px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.035em] transition-colors ${hideCompleted ? 'border-brand bg-brand text-brand-contrast' : 'border-border-strong bg-surface text-text-muted hover:bg-surface-sunken hover:text-text'}`}
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
              className={`min-w-0 rounded-[10px] border border-border bg-surface-sunken p-2.5 transition-colors hover:border-[#e9c88f] ${quest.category === 'recovery' ? 'border-l-4 border-l-[#0ea5e9]' : ''}`}
              key={quest.id}
              id={quest.category === 'recovery' ? 'recovery-quest' : undefined}
            >
              <div className="flex items-start justify-between gap-2 max-[600px]:flex-col">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-[0.35rem]">
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold leading-[1.3] ${questCategoryTag(quest.category)}`}>
                      {categoryLabels[quest.category]}
                    </span>
                    {quest.linkedGoal && <span className="inline-flex items-center rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#475569]">Linked: {quest.linkedGoal}</span>}
                    {quest.deadline && <span className="inline-flex items-center rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#475569]">{quest.deadline}</span>}
                    {quest.category === 'recovery' && (
                      <span className="inline-flex items-center rounded border border-[#fde68a] bg-[#fffbeb] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#92400e]">Daily limit: {recoveryClaimed ? '2/2' : '1/2'} used</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold leading-[1.4] text-text">{quest.title}</h3>
                  <p className="mt-1 text-sm leading-[1.5] text-text-muted">{quest.description}</p>
                </div>

                {quest.category === 'recovery' ? (
                  <button
                    type="button"
                    className="min-h-9 shrink-0 rounded-md border border-[#99f6e4] bg-[#f0fdfa] px-[0.7rem] py-2 text-[0.65rem] font-bold uppercase tracking-[0.03em] text-[#0f766e] transition-colors hover:bg-[#ccfbf1] disabled:cursor-default disabled:border-[#a7f3d0] disabled:bg-[#ecfdf5] disabled:text-[#047857] max-[600px]:self-start"
                    onClick={() => onClaimRecovery(quest)}
                    disabled={recoveryClaimed}
                  >
                    {recoveryClaimed ? 'Restored' : `Claim +${quest.reward} HP`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`min-h-9 shrink-0 rounded-md border px-[0.7rem] py-2 text-[0.65rem] font-bold uppercase tracking-[0.03em] transition-colors max-[600px]:self-start ${isComplete ? 'cursor-default border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]' : 'border-brand bg-brand text-brand-contrast hover:bg-brand-hover hover:border-brand-hover'}`}
                    onClick={() => onComplete(quest)}
                    disabled={isComplete}
                  >
                    {isComplete ? 'Completed' : 'Complete quest'}
                  </button>
                )}
              </div>

              {quest.category === 'recovery' ? (
                <div className="mt-2.5 flex flex-wrap justify-between gap-2 border-t border-border pt-2.5 text-xs font-semibold text-[#0f766e] [&>span]:font-normal [&>span]:text-text-faint">
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
                    <strong className="text-[#047857]">= +{quest.reward} XP</strong>
                  </div>
                  <div className="flex flex-wrap items-center gap-[0.35rem]">
                    {quest.attributeRewards.map((reward) => (
                      <span className="inline-flex items-center rounded border border-[#bfdbfe] bg-[#eff6ff] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#1d4ed8]" key={reward}>{reward}</span>
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
