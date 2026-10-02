import { useMemo, useState, type FormEvent } from 'react'
import {
  initialQuests,
  type QuestItem,
} from '../Dashboard/dashboard-data'
import { ActivityGrid } from './ActivityGrid'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'

type QuestFilter = 'all' | QuestItem['category']

const categoryLabels: Record<QuestItem['category'], string> = {
  main: 'Main',
  side: 'Side',
  challenge: 'Challenge',
  recovery: 'Recovery',
}

export function QuestManagementPage() {
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
    <div className="feature-page feature-page__content">
      <ActivityGrid seed={42} />
      <DemoNotice>
        Quest completion is a preview only. XP calculations and attribute updates are not written to a ledger.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Active objectives', value: String(activeQuests.filter((quest) => quest.category !== 'recovery').length), note: 'Main, side and challenge quests', tone: 'violet' },
          { label: 'Potential rewards', value: `${activeQuests.reduce((sum, quest) => sum + quest.reward, 0)} XP`, note: 'Before consistency adjustment', tone: 'sky' },
          { label: 'Completed today', value: String(completed.length), note: 'Temporary session state', tone: 'emerald' },
          { label: 'Recovery quests', value: String(quests.filter((quest) => quest.category === 'recovery').length), note: 'Daily claim limit applies', tone: 'amber' },
        ]}
      />

      <FeaturePanel
        title="Quest board"
        description="One-time objectives with transparent reward breakdowns."
        action={
          <button
            type="button"
            className="feature-button feature-button--primary"
            onClick={() => setShowForm((visible) => !visible)}
            aria-expanded={showForm}
            aria-controls="create-quest-form"
          >
            {showForm ? 'Cancel' : '+ New quest'}
          </button>
        }
      >
        <div className="feature-panel__toolbar">
          <div className="feature-filter-group" role="group" aria-label="Filter quest categories">
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
          <span className="panel-count">{activeQuests.length} active</span>
        </div>

        {showForm && (
          <form id="create-quest-form" className="feature-form" onSubmit={submitQuest}>
            <label className="feature-form__field feature-form__field--wide">
              Quest title
              <input className="feature-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required autoFocus />
            </label>
            <label className="feature-form__field feature-form__field--wide">
              Description
              <input className="feature-input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} required />
            </label>
            <label className="feature-form__field">
              Type
              <select className="feature-select" value={category} onChange={(event) => setCategory(event.target.value as QuestItem['category'])}>
                {(['main', 'side', 'challenge', 'recovery'] as const).map((key) => (
                  <option value={key} key={key}>{categoryLabels[key]}</option>
                ))}
              </select>
            </label>
            <div className="feature-form__actions">
              <button className="feature-button feature-button--primary" type="submit">Add sample quest</button>
            </div>
          </form>
        )}

        {visibleQuests.length === 0 ? (
          <div className="feature-empty" role="status">No quests in this category right now.</div>
        ) : (
          <div className="feature-quest-list">
            {visibleQuests.map((quest) => {
              const isRecovery = quest.category === 'recovery'
              const isComplete = completed.includes(quest.id)
              return (
                <article className={`quest-card quest-card--${quest.category}`} key={quest.id}>
                  <div className="quest-card__main">
                    <div className="quest-card__copy">
                      <div className="quest-card__tags">
                        <span className={`tag tag--quest-${quest.category}`}>{categoryLabels[quest.category]} quest</span>
                        {quest.linkedGoal && <span className="tag tag--neutral">Linked: {quest.linkedGoal}</span>}
                        {quest.deadline && <span className="tag tag--neutral">{quest.deadline}</span>}
                      </div>
                      <h3 className="quest-card__title">{quest.title}</h3>
                      <p className="quest-card__description">{quest.description}</p>
                    </div>
                    <button
                      type="button"
                      className={`feature-button${isComplete ? '' : ' feature-button--primary'}`}
                      disabled={isComplete}
                      onClick={() => finishQuest(quest)}
                    >
                      {isComplete ? 'Completed' : isRecovery ? `Claim +${quest.reward} HP` : 'Complete quest'}
                    </button>
                  </div>
                  {isRecovery ? (
                    <p className="quest-card__recovery-note">
                      Restores vitality <span>Daily limit: 1 of 2 used · Demo preview only</span>
                    </p>
                  ) : (
                    <div className="quest-formula">
                      <div className="quest-formula__math">
                        <span>Base: {quest.baseReward ?? 50}</span><span aria-hidden="true">×</span>
                        <span>Diff: {quest.difficulty ?? 1}</span><span aria-hidden="true">×</span>
                        <span>Effort: {quest.effort ?? 1}</span><span aria-hidden="true">×</span>
                        <span>Impact: {quest.impact ?? 1}</span>
                        <strong>= +{quest.reward} XP</strong>
                      </div>
                      <div className="quest-formula__attributes">
                        {quest.attributeRewards.map((reward) => <span className="tag tag--int" key={reward}>{reward}</span>)}
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
