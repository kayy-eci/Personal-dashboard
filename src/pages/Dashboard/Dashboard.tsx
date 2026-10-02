import { useEffect, useRef, useState } from 'react'
import { HabitsIcon, QuestsIcon, TimelineIcon } from '../../components/icons/Icons'
import { usePlayerStatus } from '../../features/player/usePlayerStatus'
import { AttributesPanel } from './AttributesPanel/AttributesPanel'
import { GoalsAndTimeline } from './GoalsAndTimeline'
import { HabitsSection } from './HabitsSection'
import { PlayerStatusCard } from './PlayerStatusCard/PlayerStatusCard'
import { QuestSection } from './QuestSection'
import {
  initialActivity,
  initialHabits,
  initialQuests,
  initialRecoveryQuest,
  type ActivityEntry,
  type HabitItem,
  type QuestItem,
} from './dashboard-data'
import './Dashboard.css'
import './DashboardSections.css'

const MAX_ACTIVITY_ITEMS = 10

export function Dashboard() {
  const status = usePlayerStatus()
  const [habits, setHabits] = useState(() =>
    initialHabits.map((habit) => ({ ...habit, done: habit.initialDone })),
  )
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([])
  const [recoveryClaimed, setRecoveryClaimed] = useState(false)
  const [activity, setActivity] = useState(initialActivity)
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null)
  const activitySequence = useRef(0)
  const completedHabits = habits.filter((habit) => habit.done).length

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const recordActivity = (entry: Omit<ActivityEntry, 'id' | 'time'>) => {
    const time = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} TODAY`
    const id = `demo-${activitySequence.current++}`
    setActivity((current) =>
      [{ ...entry, id, time }, ...current].slice(0, MAX_ACTIVITY_ITEMS),
    )
  }

  const handleHabitToggle = (habit: HabitItem & { done: boolean }) => {
    const isCompleting = !habit.done
    setHabits((current) =>
      current.map((item) =>
        item.id === habit.id ? { ...item, done: isCompleting } : item,
      ),
    )

    if (!isCompleting) {
      setToast({
        title: 'Habit check-in undone',
        detail: 'Only the temporary demo preview was changed.',
      })
      recordActivity({
        title: `Habit check-in undone: "${habit.name}"`,
        reward: `-${habit.reward} ${habit.rewardType}`,
        detail: 'Temporary demo preview only; no saved stats changed.',
        tone: habit.rewardType === 'HP' ? 'health' : 'xp',
      })
      return
    }
    setToast({
      title: 'Habit checked in',
      detail: `+${habit.reward} ${habit.rewardType} is a demo preview; stats are not saved.`,
    })
    recordActivity({
      title: `Habit: "${habit.name}" checked`,
      reward: `+${habit.reward} ${habit.rewardType}`,
      detail: `${habit.attributes.join(', ')} · ${habit.streak} day streak`,
      tone: habit.rewardType === 'HP' ? 'health' : 'xp',
    })
  }

  const handleQuestComplete = (quest: QuestItem) => {
    if (completedQuestIds.includes(quest.id)) return
    setCompletedQuestIds((current) => [...current, quest.id])
    setToast({
      title: 'Quest completed',
      detail: `+${quest.reward} XP is a demo preview; stats are not saved.`,
    })
    recordActivity({
      title: `Quest completed: "${quest.title}"`,
      reward: `+${quest.reward} XP`,
      detail: quest.attributeRewards.join(' · ') || 'Quest completion preview',
      tone: 'xp',
    })
  }

  const handleRecoveryClaim = (quest: QuestItem) => {
    if (recoveryClaimed) return
    setRecoveryClaimed(true)
    setToast({
      title: 'Recovery logged',
      detail: `+${quest.reward} HP is a demo preview; stats are not saved.`,
    })
    recordActivity({
      title: `Recovery: "${quest.title}" claimed`,
      reward: `+${quest.reward} HP`,
      detail: 'Vitality restoration preview · daily recovery quota used',
      tone: 'health',
    })
  }

  return (
    <div className="dashboard">
      <PlayerStatusCard
        status={status}
        completedHabits={completedHabits}
        totalHabits={habits.length}
      />
      <nav className="dashboard__quick-actions" aria-label="Quick actions">
        <a className="dashboard-action dashboard-action--primary" href="#quests">
          <QuestsIcon /> New quest
        </a>
        <a className="dashboard-action" href="#habits">
          <HabitsIcon /> Check-in habit
        </a>
        <button
          type="button"
          className="dashboard-action dashboard-action--recovery"
          onClick={() => handleRecoveryClaim(initialRecoveryQuest)}
          disabled={recoveryClaimed}
        >
          <TimelineIcon /> {recoveryClaimed ? 'Recovery logged' : 'Log recovery (+HP)'}
        </button>
      </nav>
      <AttributesPanel status={status} />
      <div className="dashboard__operations">
        <div className="dashboard__main-column">
          <HabitsSection habits={habits} onToggle={handleHabitToggle} />
          <QuestSection
            quests={initialQuests}
            completedIds={completedQuestIds}
            recoveryClaimed={recoveryClaimed}
            onComplete={handleQuestComplete}
            onClaimRecovery={handleRecoveryClaim}
          />
        </div>
        <GoalsAndTimeline activity={activity} />
      </div>
      {toast && (
        <div className="dashboard-toast" role="status" aria-live="polite">
          <span className="dashboard-toast__mark" aria-hidden="true">✓</span>
          <span>
            <strong>{toast.title}</strong>
            <span>{toast.detail}</span>
          </span>
        </div>
      )}
    </div>
  )
}
