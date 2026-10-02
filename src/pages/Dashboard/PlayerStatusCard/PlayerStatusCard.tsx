import { Avatar } from '../../../components/Avatar/Avatar'
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { usePlayerProfile } from '../../../features/player/usePlayerProfile'
import { healthPercent, xpPercent, type PlayerStatus } from '../../../features/player/types'
import './PlayerStatusCard.css'

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
    <section className="status-card" aria-labelledby="status-card-heading">
      <div className="status-card__overview">
        <Avatar
          src={profileWithAvatar.avatarSrc}
          name={profileWithAvatar.name}
          selectFile={selectAvatarFile}
          clear={clearAvatar}
          error={avatarError}
        />

        <div className="status-card__identity">
          <div className="status-card__identity-meta">
            <label className="sr-only" htmlFor="player-name">
              Character name
            </label>
            <input
              id="player-name"
              className="status-card__name"
              value={profileWithAvatar.name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Put your name"
              maxLength={40}
              autoComplete="off"
            />
            <span className="status-card__rank">Level {status.level}</span>
          </div>
          <h2 id="status-card-heading" className="status-card__heading">
            Your player profile
          </h2>
          <p className="status-card__online">
            <span aria-hidden="true" />
            Sample data · changes are temporary
          </p>
          <p className="status-card__streak">
            {status.currentStreak} day{status.currentStreak === 1 ? '' : 's'} active streak
          </p>
        </div>
      </div>

      <dl className="status-card__stats">
        <div className="status-card__stat status-card__stat--health">
          <div className="status-card__stat-heading">
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
          <span className="status-card__stat-note">{Math.round(hpPercent)}% available</span>
        </div>

        <div className="status-card__stat status-card__stat--xp">
          <div className="status-card__stat-heading">
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
          <span className="status-card__stat-note">
            {Math.round(xpPercentIntoLevel)}% to level {status.level + 1}
          </span>
        </div>

        <div className="status-card__stat status-card__stat--daily">
          <div className="status-card__stat-heading">
            <dt>Daily habits</dt>
            <dd>{completedHabits} / {totalHabits} done</dd>
          </div>
          <ProgressBar
            label="Daily habits completed"
            value={completedHabits}
            max={totalHabits}
            valueText={`${completedHabits} of ${totalHabits} daily habits completed`}
          />
          <span className="status-card__stat-note">
            {totalHabits - completedHabits} remaining today
          </span>
        </div>
      </dl>
    </section>
  )
}