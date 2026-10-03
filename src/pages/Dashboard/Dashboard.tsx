import { useEffect, useRef, useState } from 'react'
import { HabitsIcon, QuestsIcon, TimelineIcon } from '../../components/icons/Icons'
import { usePlayerStatus } from '../../features/player/usePlayerStatus'
import { AttributesPanel } from './AttributesPanel/AttributesPanel'
import { GoalsAndTimeline } from './GoalsAndTimeline'
import { HabitsSection } from './HabitsSection'
import { DashboardWidgets } from './DashboardWidgets'
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
    <div className="flex w-full max-w-[100rem] flex-col gap-5 p-4 min-[769px]:p-5 min-[769px]:pb-7 mx-auto">
      <DashboardWidgets />
      <PlayerStatusCard
        status={status}
        completedHabits={completedHabits}
        totalHabits={habits.length}
      />
      <nav className="flex flex-wrap gap-2 border-b border-border pb-4" aria-label="Quick actions">
        <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-brand bg-brand px-3 py-2 text-xs font-bold uppercase tracking-[0.035em] text-brand-contrast no-underline transition-colors hover:bg-brand-hover hover:border-brand-hover [&_svg]:h-4 [&_svg]:w-4" href="#quests">
          <QuestsIcon /> New quest
        </a>
        <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-xs font-bold uppercase tracking-[0.035em] text-text-muted no-underline transition-colors hover:bg-surface-sunken hover:text-text [&_svg]:h-4 [&_svg]:w-4" href="#habits">
          <HabitsIcon /> Check-in habit
        </a>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#bae6fd] bg-[#f0f9ff] px-3 py-2 text-xs font-bold uppercase tracking-[0.035em] text-[#0369a1] transition-colors hover:bg-[#e0f2fe] hover:text-[#075985] disabled:cursor-default disabled:border-[#a7f3d0] disabled:bg-[#ecfdf5] disabled:text-[#047857] [&_svg]:h-4 [&_svg]:w-4"
          onClick={() => handleRecoveryClaim(initialRecoveryQuest)}
          disabled={recoveryClaimed}
        >
          <TimelineIcon /> {recoveryClaimed ? 'Recovery logged' : 'Log recovery (+HP)'}
        </button>
      </nav>
      <AttributesPanel status={status} />
      <div className="grid items-start gap-4 min-[1200px]:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
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
        <div className="fixed bottom-4 right-4 z-[70] flex max-w-[min(24rem,calc(100vw-2rem))] items-center gap-3 rounded-[10px] border border-border bg-surface-overlay p-4 shadow-md" role="status" aria-live="polite">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#a7f3d0] bg-[#ecfdf5] font-bold text-[#047857]" aria-hidden="true">✓</span>
          <span>
            <strong className="block text-sm text-text">{toast.title}</strong>
            <span className="text-xs leading-[1.4] text-text-muted">{toast.detail}</span>
          </span>
        </div>
      )}
    </div>
  )
}
