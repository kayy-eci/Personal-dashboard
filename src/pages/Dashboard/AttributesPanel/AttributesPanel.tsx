import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { xpPercent, type PlayerStatus } from '../../../features/player/types'
import './AttributesPanel.css'

export interface AttributesPanelProps {
  status: PlayerStatus
}

/**
 * The six system attributes (PRD §3.6) with per-attribute level and XP.
 *
 * Read-only by design — attributes are never edited by hand, they grow from
 * completed habits, quests and milestones (PRD §2).
 */
export function AttributesPanel({ status }: AttributesPanelProps) {
  return (
    <section className="attributes" aria-labelledby="attributes-heading">
      <div className="attributes__header">
        <h2 id="attributes-heading" className="attributes__title">
          Attributes
        </h2>
        <p className="attributes__hint">Calculated from your activity</p>
      </div>

      <ul className="attributes__list" role="list">
        {status.attributes.map((attribute) => {
          const percent = xpPercent(attribute.xp, attribute.xpToNextLevel)

          return (
            <li key={attribute.key} className="attributes__item">
              <div className="attributes__meta">
                <span className="attributes__key">{attribute.key}</span>
                <span className="attributes__label">{attribute.label}</span>
                <span className="attributes__level">Lv. {attribute.level}</span>
              </div>

              <ProgressBar
                label={`${attribute.label} experience`}
                value={attribute.xp}
                max={attribute.xpToNextLevel}
                valueText={`${attribute.xp} of ${attribute.xpToNextLevel} XP, level ${attribute.level}`}
                tone="neutral"
              />

              <span className="attributes__xp">
                {attribute.xp} / {attribute.xpToNextLevel} XP ({Math.round(percent)}%)
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}