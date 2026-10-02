import { useId, useState } from 'react'
import { QuestsIcon } from '../../components/icons/Icons'
import type { QuestItem } from './dashboard-data'

type QuestFilter = 'all' | QuestItem['category']

interface QuestSectionProps {
  quests: QuestItem[]
  completedIds: string[]
  recoveryClaimed: boolean
  onComplete: (quest: QuestItem) => void
  onClaimRecovery: (quest: QuestItem) => void
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

export function QuestSection({
  quests,
  completedIds,
  recoveryClaimed,
  onComplete,
  onClaimRecovery,
}: QuestSectionProps) {
  const headingId = useId()
  const [filter, setFilter] = useState<QuestFilter>('all')
  const activeCount = quests.filter(
    (quest) => !completedIds.includes(quest.id) && !(quest.category === 'recovery' && recoveryClaimed),
  ).length
  const visibleQuests = quests.filter((quest) => filter === 'all' || quest.category === filter)

  return (
    <section className="dashboard-panel" id="quests" aria-labelledby={headingId}>
      <div className="dashboard-panel__header dashboard-panel__header--wrap">
        <div className="dashboard-panel__title-group">
          <span className="dashboard-panel__icon dashboard-panel__icon--sky">
            <QuestsIcon />
          </span>
          <div>
            <h2 className="dashboard-panel__title" id={headingId}>
              Active Quests &amp; Directives
            </h2>
            <p className="dashboard-panel__description">
              Rewards are previews until a verified activity ledger is connected.
            </p>
          </div>
        </div>
        <span className="panel-count">{activeCount} active</span>
      </div>

      <div className="quest-filters" role="group" aria-label="Filter quests">
        {(Object.keys(filterLabels) as QuestFilter[]).map((category) => {
          const count =
            category === 'all'
              ? quests.length
              : quests.filter((quest) => quest.category === category).length

          return (
            <button
              type="button"
              key={category}
              className={`quest-filters__button${filter === category ? ' quest-filters__button--active' : ''}`}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {filterLabels[category]} <span>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="quest-list">
        {visibleQuests.map((quest) => {
          const isComplete =
            completedIds.includes(quest.id) ||
            (quest.category === 'recovery' && recoveryClaimed)

          return (
            <article
              className={`quest-card quest-card--${quest.category}`}
              key={quest.id}
              id={quest.category === 'recovery' ? 'recovery-quest' : undefined}
            >
              <div className="quest-card__main">
                <div className="quest-card__copy">
                  <div className="quest-card__tags">
                    <span className={`tag tag--quest-${quest.category}`}>
                      {categoryLabels[quest.category]}
                    </span>
                    {quest.linkedGoal && <span className="tag tag--neutral">Linked: {quest.linkedGoal}</span>}
                    {quest.deadline && <span className="tag tag--neutral">{quest.deadline}</span>}
                    {quest.category === 'recovery' && (
                      <span className="tag tag--warning">Daily limit: {recoveryClaimed ? '2/2' : '1/2'} used</span>
                    )}
                  </div>
                  <h3 className="quest-card__title">{quest.title}</h3>
                  <p className="quest-card__description">{quest.description}</p>
                </div>

                {quest.category === 'recovery' ? (
                  <button
                    type="button"
                    className="button button--recovery"
                    onClick={() => onClaimRecovery(quest)}
                    disabled={recoveryClaimed}
                  >
                    {recoveryClaimed ? 'Restored' : `Claim +${quest.reward} HP`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`button${isComplete ? ' button--complete' : ' button--primary'}`}
                    onClick={() => onComplete(quest)}
                    disabled={isComplete}
                  >
                    {isComplete ? 'Completed' : 'Complete quest'}
                  </button>
                )}
              </div>

              {quest.category === 'recovery' ? (
                <div className="quest-card__recovery-note">
                  Restores {quest.reward} vitality points <span>Cooldown resets at 00:00</span>
                </div>
              ) : (
                <div className="quest-formula">
                  <div className="quest-formula__math">
                    <span>Base: {quest.baseReward}</span>
                    <span aria-hidden="true">×</span>
                    <span>Diff: {quest.difficulty}</span>
                    <span aria-hidden="true">×</span>
                    <span>Effort: {quest.effort}</span>
                    <span aria-hidden="true">×</span>
                    <span>Impact: {quest.impact ?? 1}</span>
                    <strong>= +{quest.reward} XP</strong>
                  </div>
                  <div className="quest-formula__attributes">
                    {quest.attributeRewards.map((reward) => (
                      <span className="tag tag--int" key={reward}>{reward}</span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
