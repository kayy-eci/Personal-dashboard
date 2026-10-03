import { Avatar } from '../../../components/Avatar/Avatar'
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { usePlayerProfile } from '../../../features/player/usePlayerProfile'
import { healthPercent, xpPercent, type PlayerStatus } from '../../../features/player/types'

export interface PlayerStatusCardProps {
  status: PlayerStatus
  completedHabits: number
  totalHabits: number
}

/**
 * Player status panel: portrait, editable name, then the system-determined
 * bars (health, XP, streak) from PRD §3.2.
 *
 * The name is user-owned and editable. Health, XP and level are NOT — they are
 * calculated from real activity (PRD §2), so they render read-only here.
 */
export function PlayerStatusCard({
  status,
  completedHabits,
  totalHabits,
}: PlayerStatusCardProps) {
  const { profileWithAvatar, setName, selectAvatarFile, clearAvatar, avatarError } =
    usePlayerProfile()

  const hpPercent = healthPercent(status.health, status.maxHealth)
  const xpPercentIntoLevel = xpPercent(status.xpIntoLevel, status.xpForNextLevel)

  return (
    <section className="grid grid-cols-1 gap-5 rounded-xl border border-border bg-surface p-4 shadow-xs min-[560px]:grid-cols-[minmax(13rem,0.8fr)_minmax(0,1.6fr)] min-[560px]:items-center min-[560px]:p-5" aria-labelledby="status-card-heading">
      <div className="flex min-w-0 items-center gap-4 max-[420px]:items-start">
        <div className="shrink-0 [&>div:first-child]:h-[4.5rem] [&>div:first-child]:w-[4.5rem] [&>div:first-child]:rounded-xl">
          <Avatar
            src={profileWithAvatar.avatarSrc}
            name={profileWithAvatar.name}
            selectFile={selectAvatarFile}
            clear={clearAvatar}
            error={avatarError}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="player-name">
              Character name
            </label>
            <input
              id="player-name"
              className="min-w-0 max-w-full border-0 bg-transparent p-0 text-[clamp(1.25rem,2vw,1.75rem)] font-bold tracking-[-0.03em] text-text placeholder:font-medium placeholder:text-text-faint focus:outline-none focus-visible:rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
              value={profileWithAvatar.name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Put your name"
              maxLength={40}
              autoComplete="off"
            />
            <span className="whitespace-nowrap rounded-md border border-[#efdcb0] bg-[#fdf6e8] px-2 py-0.5 font-mono text-xs font-bold text-brand">Level {status.level}</span>
          </div>
          <h2 id="status-card-heading" className="mt-1 text-sm font-medium text-text-muted">
            Your player profile
          </h2>
          <p className="mt-1 flex items-center gap-2 text-xs text-text-faint">
            <span className="h-2 w-2 rounded-full bg-[#059669]" aria-hidden="true" />
            Sample data · changes are temporary
          </p>
          <p className="mt-1 text-xs text-text-faint">
            {status.currentStreak} day{status.currentStreak === 1 ? '' : 's'} active streak
          </p>
        </div>
      </div>

      <dl className="grid w-full grid-cols-1 gap-3 min-[560px]:grid-cols-3">
        <div className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-border bg-surface-sunken p-3">
          <div className="flex justify-between gap-2 font-mono text-xs font-semibold text-text-muted [&_dt]:uppercase [&_dt]:tracking-[0.04em] [&_dd]:whitespace-nowrap [&_dd]:text-text">
            <dt>Vitality</dt>
            <dd>{status.health} / {status.maxHealth} HP</dd>
          </div>
          <ProgressBar
            label="Vitality"
            value={status.health}
            max={status.maxHealth}
            valueText={`${status.health} of ${status.maxHealth} health (${Math.round(hpPercent)}%)`}
            tone="health"
          />
          <span className="text-xs text-text-muted">{Math.round(hpPercent)}% available</span>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-border bg-surface-sunken p-3">
          <div className="flex justify-between gap-2 font-mono text-xs font-semibold text-text-muted [&_dt]:uppercase [&_dt]:tracking-[0.04em] [&_dd]:whitespace-nowrap [&_dd]:text-text">
            <dt>XP progress</dt>
            <dd>{status.totalXp.toLocaleString()} XP</dd>
          </div>
          <ProgressBar
            label="Experience to next level"
            value={status.xpIntoLevel}
            max={status.xpForNextLevel}
            valueText={`${status.xpIntoLevel} of ${status.xpForNextLevel} XP to next level`}
            tone="xp"
          />
          <span className="text-xs text-text-muted">
            {Math.round(xpPercentIntoLevel)}% to level {status.level + 1}
          </span>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-border bg-surface-sunken p-3">
          <div className="flex justify-between gap-2 font-mono text-xs font-semibold text-text-muted [&_dt]:uppercase [&_dt]:tracking-[0.04em] [&_dd]:whitespace-nowrap [&_dd]:text-text">
            <dt>Daily habits</dt>
            <dd>{completedHabits} / {totalHabits} done</dd>
          </div>
          <ProgressBar
            label="Daily habits completed"
            value={completedHabits}
            max={totalHabits}
            valueText={`${completedHabits} of ${totalHabits} daily habits completed`}
          />
          <span className="text-xs text-text-muted">
            {totalHabits - completedHabits} remaining today
          </span>
        </div>
      </dl>
    </section>
  )
}