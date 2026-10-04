import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  type QuestItem,
} from '../Dashboard/dashboard-data'
import { GitHubActivityGrid } from '../../components/github-activity-grid'
import { useGitHubActivity } from '../../hooks/useGitHubActivity'
import { getActivityCopy } from './github-activity-copy'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'
import { applySort, matchesQuery, type SortOption } from '../../hooks/useListControls'
import { completeQuest, createQuest, listQuestItems, subscribe } from '../../data'

type QuestFilter = 'all' | QuestItem['category']

const questSortOptions: SortOption<QuestItem>[] = [
  { id: 'reward-desc', label: 'Reward (high → low)', compare: (a, b) => b.reward - a.reward },
  { id: 'reward-asc', label: 'Reward (low → high)', compare: (a, b) => a.reward - b.reward },
  { id: 'difficulty-desc', label: 'Difficulty (desc)', compare: (a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0) },
  { id: 'title', label: 'Title (A–Z)', compare: (a, b) => a.title.localeCompare(b.title) },
]

const categoryLabels: Record<QuestItem['category'], string> = {
  main: 'Main',
  side: 'Side',
  challenge: 'Challenge',
  recovery: 'Recovery',
}

export function QuestManagementPage() {
  const {
    username,
    days: activityDays,
    status: activityStatus,
    source: activitySource,
    hasToken,
  } = useGitHubActivity()
  const [completed, setCompleted] = useState<string[]>([])
  const [recoveryClaims, setRecoveryClaims] = useState<string[]>([])
  const [quests, setQuests] = useState<QuestItem[]>([])
  const refreshQuests = useCallback(async () => {
    setQuests(await listQuestItems())
  }, [])
  useEffect(() => {
    const id = setTimeout(() => void refreshQuests(), 0)
    const unsub = subscribe('data', () => void refreshQuests())
    return () => {
      clearTimeout(id)
      unsub()
    }
  }, [refreshQuests])
  const [filter, setFilter] = useState<QuestFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('reward-desc')
  const [attributeFilter, setAttributeFilter] = useState('all')
  const [rewardTypeFilter, setRewardTypeFilter] = useState<'all' | 'XP' | 'HP'>('all')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<QuestItem['category']>('side')
  const [baseReward, setBaseReward] = useState(50)
  const [difficulty, setDifficulty] = useState(1)
  const [effort, setEffort] = useState(1)
  const [impact, setImpact] = useState(1)
  const [attributeRewardsText, setAttributeRewardsText] = useState('INT +50')

  const activeQuests = quests.filter((quest) => !completed.includes(quest.id))
  const attributePrefixes = useMemo(() => {
    const prefixes = new Set<string>()
    quests.forEach((quest) =>
      quest.attributeRewards.forEach((reward) => {
        const prefix = reward.split('+')[0]?.trim()
        if (prefix) prefixes.add(prefix)
      }),
    )
    return [...prefixes].sort()
  }, [quests])
  const visibleQuests = useMemo(
    () =>
      applySort(
        quests.filter((quest) => {
          const matchesCategory = filter === 'all' || quest.category === filter
          const matchesCompletion = quest.category === 'recovery' || !completed.includes(quest.id)
          const matchesRewardType = rewardTypeFilter === 'all' || quest.rewardType === rewardTypeFilter
          const matchesAttribute =
            attributeFilter === 'all' ||
            quest.attributeRewards.some((reward) => reward.split('+')[0]?.trim() === attributeFilter)
          return (
            matchesCategory &&
            matchesCompletion &&
            matchesRewardType &&
            matchesAttribute &&
            matchesQuery(quest, search, (item) => [item.title, item.description, item.linkedGoal])
          )
        }),
        sort,
        questSortOptions,
      ),
    [attributeFilter, completed, filter, quests, rewardTypeFilter, search, sort],
  )

  const submitQuest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle || !trimmedDescription) return
    void createQuest({
      title: trimmedTitle,
      description: trimmedDescription,
      type: category,
      category: 'general',
      difficulty: Math.max(1, Math.min(5, Math.round(difficulty))),
      effort: Math.max(1, Math.min(5, Math.round(effort))),
      impact: Math.max(1, Math.min(5, Math.round(impact))),
      baseXp: baseReward,
      attributes: attributeRewardsText
        .split(',')
        .map((part) => part.trim().split('+')[0]?.trim())
        .filter((part): part is NonNullable<typeof part> => typeof part === 'string' && part.length > 0) as never[],
    }).then(() => refreshQuests())
    setTitle('')
    setDescription('')
    setCategory('side')
    setBaseReward(50)
    setDifficulty(1)
    setEffort(1)
    setImpact(1)
    setAttributeRewardsText('INT +50')
    setFilter(category)
    setShowForm(false)
  }

  const finishQuest = (quest: QuestItem) => {
    if (quest.category === 'recovery') {
      if (!recoveryClaims.includes(quest.id)) {
        void completeQuest(Number(quest.id))
          .then(() => {
            setRecoveryClaims((current) => (current.length >= 2 ? current : [...current, quest.id]))
            void refreshQuests()
          })
          .catch(() => setRecoveryClaims((current) => current))
      }
      return
    }
    void completeQuest(Number(quest.id)).then(() => {
      setCompleted((current) => (current.includes(quest.id) ? current : [...current, quest.id]))
      void refreshQuests()
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 p-3 pb-5 min-[769px]:p-4 min-[769px]:pb-6">
      <GitHubActivityGrid
        days={activityDays}
        activityType="contribution"
        periodLabel={getActivityCopy(username, activityStatus, activitySource, hasToken).periodLabel}
        description={getActivityCopy(username, activityStatus, activitySource, hasToken).description}
      />
      <DemoNotice>
        Quest completion writes XP to the ledger and updates your character stats, saved in this browser.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Active objectives', value: String(activeQuests.filter((quest) => quest.category !== 'recovery').length), note: 'Main, side and challenge quests', tone: 'gold' },
          { label: 'Potential rewards', value: `${activeQuests.reduce((sum, quest) => sum + quest.reward, 0)} XP`, note: 'Before consistency adjustment', tone: 'sky' },
          { label: 'Completed today', value: String(completed.length), note: 'Finished quests', tone: 'emerald' },
          { label: 'Recovery quests', value: String(quests.filter((quest) => quest.category === 'recovery').length), note: 'Daily claim limit applies', tone: 'ember' },
        ]}
      />

      <FeaturePanel
        title="Quest board"
        description="One-time objectives with transparent reward breakdowns."
        action={
          <button
            type="button"
            className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover"
            onClick={() => setShowForm((visible) => !visible)}
            aria-expanded={showForm}
            aria-controls="create-quest-form"
          >
            {showForm ? 'Cancel' : '+ New quest'}
          </button>
        }
      >
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem] [&>button]:rounded [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-[0.55rem] [&>button]:py-[0.35rem] [&>button]:text-xs [&>button]:font-semibold [&>button]:text-text-muted hover:[&>button]:text-text [&>button[aria-pressed=true]]:border-border [&>button[aria-pressed=true]]:bg-surface-overlay [&>button[aria-pressed=true]]:text-text [&>button[aria-pressed=true]]:shadow-xs" role="group" aria-label="Filter quest categories">
            {(['all', 'main', 'side', 'challenge', 'recovery'] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {key === 'all' ? 'All' : categoryLabels[key]}
              </button>
            ))}
          </div>
          <span className="shrink-0 rounded-md bg-surface-sunken px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-text-muted">{activeQuests.length} active</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <input
            className="min-h-[var(--control-h)] flex-1 max-w-[24rem] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-brand"
            type="search"
            placeholder="Search quests"
            aria-label="Search quests"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            Sort
            <select
              className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
              aria-label="Sort quests"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {questSortOptions.map((option) => (
                <option value={option.id} key={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem] [&>button]:rounded [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-[0.55rem] [&>button]:py-[0.35rem] [&>button]:text-xs [&>button]:font-semibold [&>button]:text-text-muted hover:[&>button]:text-text [&>button[aria-pressed=true]]:border-border [&>button[aria-pressed=true]]:bg-surface-overlay [&>button[aria-pressed=true]]:text-text [&>button[aria-pressed=true]]:shadow-xs" role="group" aria-label="Filter by attribute">
            {['all', ...attributePrefixes].map((prefix) => (
              <button
                key={prefix}
                type="button"
                aria-pressed={attributeFilter === prefix}
                onClick={() => setAttributeFilter(prefix)}
              >
                {prefix === 'all' ? 'All attributes' : prefix}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem] [&>button]:rounded [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-[0.55rem] [&>button]:py-[0.35rem] [&>button]:text-xs [&>button]:font-semibold [&>button]:text-text-muted hover:[&>button]:text-text [&>button[aria-pressed=true]]:border-border [&>button[aria-pressed=true]]:bg-surface-overlay [&>button[aria-pressed=true]]:text-text [&>button[aria-pressed=true]]:shadow-xs" role="group" aria-label="Filter by reward type">
            {(['all', 'XP', 'HP'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={rewardTypeFilter === option}
                onClick={() => setRewardTypeFilter(option)}
              >
                {option === 'all' ? 'All rewards' : option}
              </button>
            ))}
          </div>
        </div>

        {showForm && (
          <form id="create-quest-form" className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-sunken p-3 min-[600px]:grid-cols-3 max-[480px]:grid-cols-1" onSubmit={submitQuest}>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted col-span-full">
              Quest title
              <input className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required autoFocus />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted col-span-full">
              Description
              <input className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} required />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Type
              <select className="min-h-[var(--control-h)] min-w-32 rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text" value={category} onChange={(event) => setCategory(event.target.value as QuestItem['category'])}>
                {(['main', 'side', 'challenge', 'recovery'] as const).map((key) => (
                  <option value={key} key={key}>{categoryLabels[key]}</option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Base reward
              <input
                className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
                type="number"
                min={0}
                value={baseReward}
                onChange={(event) => setBaseReward(Number(event.target.value) || 0)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Difficulty
              <input
                className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
                type="number"
                min={0}
                step={0.1}
                value={difficulty}
                onChange={(event) => setDifficulty(Number(event.target.value) || 0)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Effort
              <input
                className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
                type="number"
                min={0}
                step={0.1}
                value={effort}
                onChange={(event) => setEffort(Number(event.target.value) || 0)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Impact
              <input
                className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
                type="number"
                min={0}
                step={0.1}
                value={impact}
                onChange={(event) => setImpact(Number(event.target.value) || 0)}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted col-span-full">
              Attribute rewards (comma-separated, e.g. INT +50, FOCUS +25)
              <input
                className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
                value={attributeRewardsText}
                onChange={(event) => setAttributeRewardsText(event.target.value)}
                maxLength={120}
              />
            </label>
            <p className="col-span-full text-xs text-text-muted">
              Computed reward: <strong className="font-mono">+{Math.round(baseReward * difficulty * effort * impact)} XP</strong>
            </p>
            <div className="col-span-full flex flex-wrap gap-2">
              <button className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover" type="submit">Add sample quest</button>
            </div>
          </form>
        )}

        {visibleQuests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-sunken p-3 text-center text-sm text-text-muted" role="status">No quests in this category right now.</div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {visibleQuests.map((quest) => {
              const isRecovery = quest.category === 'recovery'
              const isComplete = isRecovery ? recoveryClaims.includes(quest.id) : completed.includes(quest.id)
              const recoveryLimitReached = recoveryClaims.length >= 2
              return (
                <article className={`${quest.category === 'recovery' ? 'min-w-0 scroll-mt-4 rounded-[10px] border border-border border-l-4 border-l-[var(--info)] bg-surface-sunken p-3 transition-colors' : 'min-w-0 scroll-mt-4 rounded-[10px] border border-border bg-surface-sunken p-3 transition-colors hover:border-[var(--warning-border)]'}`} key={quest.id}>
                  <div className="flex items-start justify-between gap-3 max-[600px]:flex-col">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-[0.35rem]">
                        <span className={`${quest.category === 'main' ? 'inline-flex items-center rounded border border-[var(--danger-border)] bg-[var(--danger-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--danger-text)]' : quest.category === 'side' ? 'inline-flex items-center rounded border border-[var(--info-border)] bg-[var(--info-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--info-text)]' : quest.category === 'challenge' ? 'inline-flex items-center rounded border border-[var(--warning-border)] bg-[var(--warning-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--warning-text)]' : 'inline-flex items-center rounded border border-[var(--success-border)] bg-[var(--success-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--attr-focus)]'}`}>{categoryLabels[quest.category]} quest</span>
                        {quest.linkedGoal && <span className="inline-flex items-center rounded border border-[var(--attr-border)] bg-[var(--attr-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--text-muted)]">Linked: {quest.linkedGoal}</span>}
                        {quest.deadline && <span className="inline-flex items-center rounded border border-[var(--attr-border)] bg-[var(--attr-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--text-muted)]">{quest.deadline}</span>}
                      </div>
                      <h3 className="text-sm font-bold leading-[1.4] text-text">{quest.title}</h3>
                      <p className="mt-1 text-sm leading-[1.5] text-text-muted">{quest.description}</p>
                    </div>
                    <button
                      type="button"
                      className={`inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60${isComplete ? '' : ' border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover'}`}
                      disabled={isComplete || (isRecovery && recoveryLimitReached)}
                      onClick={() => finishQuest(quest)}
                    >
                      {isComplete ? 'Completed' : isRecovery ? (recoveryLimitReached ? 'Daily limit reached' : `Claim +${quest.reward} HP`) : 'Complete quest'}
                    </button>
                  </div>
                  {isRecovery ? (
                    <p className="mt-3 flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-xs font-semibold text-[var(--attr-focus)] [&>span]:font-normal [&>span]:text-text-faint">
                      Restores vitality 
<span>{recoveryClaims.length} of 2 used · saved to your health log</span>
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <div className="flex flex-wrap items-center gap-[0.35rem] font-mono text-[0.65rem] text-text-faint [&>span]:rounded [&>span]:border [&>span]:border-border [&>span]:bg-surface [&>span]:px-1.5 [&>span]:py-0.5 [&>span]:text-text-muted [&_strong]:text-[var(--success-text)]">
                        <span>Base: {quest.baseReward ?? 50}</span><span aria-hidden="true">×</span>
                        <span>Diff: {quest.difficulty ?? 1}</span><span aria-hidden="true">×</span>
                        <span>Effort: {quest.effort ?? 1}</span><span aria-hidden="true">×</span>
                        <span>Impact: {quest.impact ?? 1}</span>
                        <strong>= +{quest.reward} XP</strong>
                      </div>
                      <div className="flex flex-wrap items-center gap-[0.35rem]">
                        {quest.attributeRewards.map((reward) => <span className="inline-flex items-center rounded border border-[var(--info-border)] bg-[var(--info-soft)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[var(--info-text)]" key={reward}>{reward}</span>)}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </FeaturePanel>
    </div>
  )
}
