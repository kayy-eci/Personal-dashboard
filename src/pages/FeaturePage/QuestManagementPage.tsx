import { useMemo, useState, type FormEvent } from 'react'
import {
  initialQuests,
  type QuestItem,
} from '../Dashboard/dashboard-data'
import { GitHubActivityGrid } from '../../components/github-activity-grid'
import { useGitHubActivity } from '../../hooks/useGitHubActivity'
import { getActivityCopy } from './github-activity-copy'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'

type QuestFilter = 'all' | QuestItem['category']

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
  const [quests, setQuests] = useState(initialQuests)
  const [completed, setCompleted] = useState<string[]>([])
  const [filter, setFilter] = useState<QuestFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<QuestItem['category']>('side')

  const activeQuests = quests.filter((quest) => !completed.includes(quest.id))
  const visibleQuests = useMemo(
    () =>
      quests.filter(
        (quest) =>
          (filter === 'all' || quest.category === filter) &&
          (quest.category === 'recovery' || !completed.includes(quest.id)),
      ),
    [completed, filter, quests],
  )

  const submitQuest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle || !trimmedDescription) return
    setQuests((current) => [
      {
        id: `quest-${Date.now()}`,
        category,
        title: trimmedTitle,
        description: trimmedDescription,
        baseReward: 50,
        difficulty: 1,
        effort: 1,
        impact: 1,
        reward: 50,
        rewardType: 'XP',
        attributeRewards: ['INT +50'],
      },
      ...current,
    ])
    setTitle('')
    setDescription('')
    setCategory('side')
    setFilter(category)
    setShowForm(false)
  }

  const finishQuest = (quest: QuestItem) => {
    setCompleted((current) => [...current, quest.id])
  }

  return (
    <div className="flex w-full max-w-[100rem] mx-auto flex-col gap-4 p-4 min-[769px]:p-5 min-[769px]:pb-7">
      <GitHubActivityGrid
        days={activityDays}
        activityType="contribution"
        periodLabel={getActivityCopy(username, activityStatus, activitySource, hasToken).periodLabel}
        description={getActivityCopy(username, activityStatus, activitySource, hasToken).description}
      />
      <DemoNotice>
        Quest completion is a preview only. XP calculations and attribute updates are not written to a ledger.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Active objectives', value: String(activeQuests.filter((quest) => quest.category !== 'recovery').length), note: 'Main, side and challenge quests', tone: 'gold' },
          { label: 'Potential rewards', value: `${activeQuests.reduce((sum, quest) => sum + quest.reward, 0)} XP`, note: 'Before consistency adjustment', tone: 'sky' },
          { label: 'Completed today', value: String(completed.length), note: 'Temporary session state', tone: 'emerald' },
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

        {showForm && (
          <form id="create-quest-form" className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-sunken p-3 min-[600px]:grid-cols-3 max-[480px]:grid-cols-1" onSubmit={submitQuest}>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted col-span-full">
              Quest title
              <input className="min-h-10 rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required autoFocus />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted col-span-full">
              Description
              <input className="min-h-10 rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} required />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-text-muted">
              Type
              <select className="min-h-10 min-w-32 rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text" value={category} onChange={(event) => setCategory(event.target.value as QuestItem['category'])}>
                {(['main', 'side', 'challenge', 'recovery'] as const).map((key) => (
                  <option value={key} key={key}>{categoryLabels[key]}</option>
                ))}
              </select>
            </label>
            <div className="col-span-full flex flex-wrap gap-2">
              <button className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover" type="submit">Add sample quest</button>
            </div>
          </form>
        )}

        {visibleQuests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-sunken p-5 text-center text-sm text-text-muted" role="status">No quests in this category right now.</div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {visibleQuests.map((quest) => {
              const isRecovery = quest.category === 'recovery'
              const isComplete = completed.includes(quest.id)
              return (
                <article className={`${quest.category === 'recovery' ? 'min-w-0 scroll-mt-4 rounded-[10px] border border-border border-l-4 border-l-[#0ea5e9] bg-surface-sunken p-3 transition-colors' : 'min-w-0 scroll-mt-4 rounded-[10px] border border-border bg-surface-sunken p-3 transition-colors hover:border-[#e9c88f]'}`} key={quest.id}>
                  <div className="flex items-start justify-between gap-3 max-[600px]:flex-col">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-[0.35rem]">
                        <span className={`${quest.category === 'main' ? 'inline-flex items-center rounded border border-[#fecdd3] bg-[#fff1f2] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#be123c]' : quest.category === 'side' ? 'inline-flex items-center rounded border border-[#bae6fd] bg-[#f0f9ff] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#0369a1]' : quest.category === 'challenge' ? 'inline-flex items-center rounded border border-[#fde68a] bg-[#fffbeb] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#b45309]' : 'inline-flex items-center rounded border border-[#99f6e4] bg-[#f0fdfa] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#0f766e]'}`}>{categoryLabels[quest.category]} quest</span>
                        {quest.linkedGoal && <span className="inline-flex items-center rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#475569]">Linked: {quest.linkedGoal}</span>}
                        {quest.deadline && <span className="inline-flex items-center rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#475569]">{quest.deadline}</span>}
                      </div>
                      <h3 className="text-sm font-bold leading-[1.4] text-text">{quest.title}</h3>
                      <p className="mt-1 text-sm leading-[1.5] text-text-muted">{quest.description}</p>
                    </div>
                    <button
                      type="button"
                      className={`inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60${isComplete ? '' : ' border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover'}`}
                      disabled={isComplete}
                      onClick={() => finishQuest(quest)}
                    >
                      {isComplete ? 'Completed' : isRecovery ? `Claim +${quest.reward} HP` : 'Complete quest'}
                    </button>
                  </div>
                  {isRecovery ? (
                    <p className="mt-3 flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-xs font-semibold text-[#0f766e] [&>span]:font-normal [&>span]:text-text-faint">
                      Restores vitality <span>Daily limit: 1 of 2 used · Demo preview only</span>
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <div className="flex flex-wrap items-center gap-[0.35rem] font-mono text-[0.65rem] text-text-faint [&>span]:rounded [&>span]:border [&>span]:border-border [&>span]:bg-surface [&>span]:px-1.5 [&>span]:py-0.5 [&>span]:text-text-muted [&_strong]:text-[#047857]">
                        <span>Base: {quest.baseReward ?? 50}</span><span aria-hidden="true">×</span>
                        <span>Diff: {quest.difficulty ?? 1}</span><span aria-hidden="true">×</span>
                        <span>Effort: {quest.effort ?? 1}</span><span aria-hidden="true">×</span>
                        <span>Impact: {quest.impact ?? 1}</span>
                        <strong>= +{quest.reward} XP</strong>
                      </div>
                      <div className="flex flex-wrap items-center gap-[0.35rem]">
                        {quest.attributeRewards.map((reward) => <span className="inline-flex items-center rounded border border-[#bfdbfe] bg-[#eff6ff] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#1d4ed8]" key={reward}>{reward}</span>)}
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
