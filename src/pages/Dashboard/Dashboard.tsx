import { useEffect, useRef, useState } from 'react'
import { HabitsIcon, QuestsIcon, TimelineIcon } from '../../components/icons/Icons'
import { usePlayerStatus } from '../../features/player/usePlayerStatus'
import { usePersistentState } from '../../lib/storage'
import { usePreferences } from '../../preferences/usePreferences'
import { rangeForPreset, type DatePreset } from '../../lib/dates'
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

const ACTIVITY_DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'Week' },
  { id: 'this-month', label: 'Month' },
  { id: 'all', label: 'All' },
]

function parseRewardValue(reward: string): number | null {
  const match = /^\s*([+-]?\d+)\s*(XP|HP)/i.exec(reward)
  return match ? Number.parseInt(match[1], 10) : null
}

function parseActivityDate(time: string): Date | null {
  const upper = time.toUpperCase()
  if (upper.includes('TODAY')) return new Date()
  if (upper.includes('YESTERDAY')) {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  }
  const parsed = new Date(time)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function Dashboard() {
  const status = usePlayerStatus()
  const { preferences } = usePreferences()
  const [doneMap, setDoneMap, resetDoneMap] = usePersistentState<Record<string, boolean>>('habits-done', {})
  const [completedQuestIds, setCompletedQuestIds, resetCompletedQuestIds] = usePersistentState<string[]>('completed-quest-ids', [])
  const [recoveryClaimed, setRecoveryClaimed, resetRecoveryClaimed] = usePersistentState('recovery-claimed', false)
  const [activity, setActivity, resetActivity] = usePersistentState<ActivityEntry[]>('activity-feed', initialActivity)
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [toast, setToast] = useState<{ title: string; detail: string; action?: { label: string; onClick: () => void } } | null>(null)
  const activitySequence = useRef(0)
  const habits = initialHabits.map((habit) => ({
    ...habit,
    done: doneMap[habit.id] ?? habit.initialDone,
  }))
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

  const sumXp = (preset: DatePreset) => {
    const range = rangeForPreset(preset, new Date(), preferences.weekStart)
    return activity.reduce((total, entry) => {
      if (!entry.reward.toUpperCase().includes('XP')) return total
      const value = parseRewardValue(entry.reward)
      if (value === null || value <= 0) return total
      const parsed = parseActivityDate(entry.time)
      if (parsed === null) return preset === 'all' ? total + value : total
      if (range !== null && (parsed < range.start || parsed > range.end)) return total
      return total + value
    }, 0)
  }
  const xpTotals = { today: sumXp('today'), week: sumXp('this-week'), month: sumXp('this-month') }

  const handleResetDemo = () => {
    resetDoneMap()
    resetCompletedQuestIds()
    resetRecoveryClaimed()
    resetActivity()
    activitySequence.current = 0
    setSelectedAttribute(null)
    setDatePreset('all')
    setToast(null)
  }

  const handleHabitToggle = (habit: HabitItem & { done: boolean }) => {
    const isCompleting = !habit.done
    setDoneMap((current) => ({ ...current, [habit.id]: isCompleting }))
    const undoToggle = () =>
      setDoneMap((current) => ({ ...current, [habit.id]: !isCompleting }))

    if (!isCompleting) {
      setToast({
        title: 'Habit check-in undone',
        detail: 'Only the temporary demo preview was changed.',
        action: { label: 'Undo', onClick: undoToggle },
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
      action: { label: 'Undo', onClick: undoToggle },
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
      action: { label: 'Undo', onClick: () => setCompletedQuestIds((current) => current.filter((id) => id !== quest.id)) },
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
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 p-3 pb-5 min-[769px]:p-4 min-[769px]:pb-6">
      <DashboardWidgets />
      <PlayerStatusCard
        status={status}
        completedHabits={completedHabits}
        totalHabits={habits.length}
      />
      <nav className="flex flex-wrap gap-1.5 border-b border-border pb-3" aria-label="Quick actions">
        <a className="inline-flex min-h-9 items-center gap-2 rounded-md border border-brand bg-brand px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.035em] text-brand-contrast no-underline transition-colors hover:bg-brand-hover hover:border-brand-hover [&_svg]:h-4 [&_svg]:w-4" href="#quests">
          <QuestsIcon /> New quest
        </a>
        <a className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.035em] text-text-muted no-underline transition-colors hover:bg-surface-sunken hover:text-text [&_svg]:h-4 [&_svg]:w-4" href="#habits">
          <HabitsIcon /> Check-in habit
        </a>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#bae6fd] bg-[#f0f9ff] px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.035em] text-[#0369a1] transition-colors hover:bg-[#e0f2fe] hover:text-[#075985] disabled:cursor-default disabled:border-[#a7f3d0] disabled:bg-[#ecfdf5] disabled:text-[#047857] [&_svg]:h-4 [&_svg]:w-4"
          onClick={() => handleRecoveryClaim(initialRecoveryQuest)}
          disabled={recoveryClaimed}
        >
          <TimelineIcon /> {recoveryClaimed ? 'Recovery logged' : 'Log recovery (+HP)'}
        </button>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.035em] text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
          onClick={handleResetDemo}
        >
          Reset demo
        </button>
      </nav>
      <AttributesPanel status={status} selectedAttribute={selectedAttribute} onAttributeSelect={setSelectedAttribute} />
      <div className="grid items-start gap-3 min-[1200px]:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)]">
        <div className="flex flex-col gap-3 max-[600px]:text-xs">
          <HabitsSection habits={habits} onToggle={handleHabitToggle} selectedAttribute={selectedAttribute} />
          <QuestSection
            quests={initialQuests}
            completedIds={completedQuestIds}
            recoveryClaimed={recoveryClaimed}
            onComplete={handleQuestComplete}
            onClaimRecovery={handleRecoveryClaim}
            selectedAttribute={selectedAttribute}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Activity date range">
            <span className="font-mono text-[0.65rem] font-bold uppercase text-text-muted">Activity range</span>
            {ACTIVITY_DATE_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${datePreset === preset.id ? 'border-brand bg-brand text-brand-contrast' : 'border-border bg-surface text-text-muted hover:bg-surface-sunken hover:text-text'}`}
                aria-pressed={datePreset === preset.id}
                onClick={() => setDatePreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <GoalsAndTimeline
            activity={activity}
            dateRange={rangeForPreset(datePreset, new Date(), preferences.weekStart)}
            xpTotals={xpTotals}
          />
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-3 right-3 z-[70] flex max-w-[min(24rem,calc(100vw-1.5rem))] items-center gap-2.5 rounded-[10px] border border-border bg-surface-overlay p-3 shadow-md" role="status" aria-live="polite">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#a7f3d0] bg-[#ecfdf5] font-bold text-[#047857]" aria-hidden="true">✓</span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm text-text">{toast.title}</strong>
            <span className="text-xs leading-[1.4] text-text-muted">{toast.detail}</span>
          </span>
          {toast.action && (
            <button
              type="button"
              className="shrink-0 rounded-md border border-brand bg-brand px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.035em] text-brand-contrast transition-colors hover:bg-brand-hover hover:border-brand-hover"
              onClick={() => {
                toast.action?.onClick()
                setToast(null)
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
