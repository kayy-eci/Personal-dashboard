import { Avatar } from '../../../components/Avatar/Avatar'
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { usePlayerProfile } from '../../../features/player/usePlayerProfile'
import { healthPercent, xpPercent, type PlayerStatus } from '../../../features/player/types'
import './PlayerStatusCard.css'

export interface PlayerStatusCardProps {
  status: PlayerStatus
}

/**
 * Player status panel: portrait, editable name, then the system-determined
 * bars (health, XP, streak) from PRD §3.2.
 *
 * The name is user-owned and editable. Health, XP and level are NOT — they are
 * calculated from real activity (PRD §2), so they render read-only here.
 */
export function PlayerStatusCard({ status }: PlayerStatusCardProps) {
  const { profileWithAvatar, setName, selectAvatarFile, clearAvatar, avatarError } =
    usePlayerProfile()

  const hpPercent = healthPercent(status.health, status.maxHealth)
  const xpPercentIntoLevel = xpPercent(status.xpIntoLevel, status.xpForNextLevel)

  return (
    <section className="status-card" aria-labelledby="status-card-heading">
      <h2 id="status-card-heading" className="sr-only">
        Player status
      </h2>

      <Avatar
        src={profileWithAvatar.avatarSrc}
        name={profileWithAvatar.name}
        selectFile={selectAvatarFile}
        clear={clearAvatar}
        error={avatarError}
      />

      <div className="status-card__identity">
        <label className="sr-only" htmlFor="player-name">
          Your name
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
      </div>

      <dl className="status-card__stats">
        <div className="status-card__level">
          <dt className="sr-only">Level</dt>
          <dd className="status-card__level-value">Level {status.level}</dd>
        </div>

        <div className="status-card__stat">
          <dt className="status-card__stat-label">Health</dt>
          <dd className="status-card__stat-body">
            <ProgressBar
              label="Health"
              value={status.health}
              max={status.maxHealth}
              valueText={`${status.health} of ${status.maxHealth} health`}
              tone="health"
            />
            <span className="status-card__stat-value">
              {status.health} / {status.maxHealth} HP ({Math.round(hpPercent)}%)
            </span>
          </dd>
        </div>

        <div className="status-card__stat">
          <dt className="status-card__stat-label">Experience</dt>
          <dd className="status-card__stat-body">
            <ProgressBar
              label="Experience to next level"
              value={status.xpIntoLevel}
              max={status.xpForNextLevel}
              valueText={`${status.xpIntoLevel} of ${status.xpForNextLevel} XP to next level`}
              tone="xp"
            />
            <span className="status-card__stat-value">
              {status.xpIntoLevel} / {status.xpForNextLevel} XP ({Math.round(xpPercentIntoLevel)}%)
            </span>
          </dd>
        </div>

        <div className="status-card__stat">
          <dt className="status-card__stat-label">Streak</dt>
          <dd className="status-card__stat-body">
            <span className="status-card__stat-value">
              {status.currentStreak} day{status.currentStreak === 1 ? '' : 's'}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  )
}