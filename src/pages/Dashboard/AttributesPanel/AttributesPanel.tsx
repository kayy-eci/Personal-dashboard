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
        <div>
          <h2 id="attributes-heading" className="attributes__title">
            Core attributes
          </h2>
          <p className="attributes__hint">
            System-computed from your completed activities
          </p>
        </div>
        <span className="attributes__source">Read only</span>
      </div>

      <ul className="attributes__list" role="list">
        {status.attributes.map((attribute) => {
          const percent = xpPercent(attribute.xp, attribute.xpToNextLevel)

          return (
            <li
              key={attribute.key}
              className="attributes__item"
              data-attribute={attribute.key}
            >
              <div className="attributes__item-heading">
                <span className="attributes__key">{attribute.key}</span>
                <span className="attributes__level">LV {attribute.level}</span>
              </div>
              <h3 className="attributes__label">{attribute.label}</h3>

              <ProgressBar
                label={`${attribute.label} experience`}
                value={attribute.xp}
                max={attribute.xpToNextLevel}
                valueText={`${attribute.xp} of ${attribute.xpToNextLevel} XP, level ${attribute.level}`}
                tone="neutral"
              />

              <span className="attributes__xp">
                {attribute.xp.toLocaleString()} XP
                <span>{Math.round(percent)}% to next level</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}