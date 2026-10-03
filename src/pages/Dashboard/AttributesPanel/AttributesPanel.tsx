import { useState, type ReactNode } from 'react'
import { xpPercent, type PlayerStatus } from '../../../features/player/types'

export interface AttributesPanelProps {
  status: PlayerStatus
  selectedAttribute?: string | null
  onAttributeSelect?: (key: string | null) => void
  /** Rendered at the end of the header — the section menu. */
  menu?: ReactNode
}

function attributeColors(key: string): [string, string] {
  switch (key) {
    case 'STR': return ['#e11d48', '#fff1f2']
    case 'INT': return ['#2563eb', '#eff6ff']
    case 'DISC': return ['#65a30d', '#f7fee7']
    case 'CREAT': return ['#ea580c', '#fff3ea']
    case 'FOCUS': return ['#0d9488', '#f0fdfa']
    case 'SOC': return ['#059669', '#ecfdf5']
    default: return ['#73726e', '#f7f7f5']
  }
}

/**
 * The six system attributes (PRD §3.6) with per-attribute level and XP.
 *
 * Read-only by design — attributes are never edited by hand, they grow from
 * completed habits, quests and milestones (PRD §2).
 */
export function AttributesPanel({ status, selectedAttribute, onAttributeSelect, menu }: AttributesPanelProps) {
  const [sortId, setSortId] = useState<'level' | 'xp' | 'alpha'>('level')
  const sortedAttributes = [...status.attributes].sort((a, b) => {
    if (sortId === 'xp') return b.xp - a.xp
    if (sortId === 'alpha') return a.label.localeCompare(b.label)
    return b.level - a.level
  })

  return (
    <section className="group/section flex flex-col gap-3" aria-labelledby="attributes-heading">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="attributes-heading" className="text-lg font-bold tracking-[-0.01em] text-text">
            Core attributes
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            System-computed from your completed activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
            Sort
            <select
              className="rounded-md border border-border-strong bg-surface-overlay px-2 py-1 text-xs text-text"
              value={sortId}
              onChange={(event) => setSortId(event.target.value as 'level' | 'xp' | 'alpha')}
            >
              <option value="level">Level</option>
              <option value="xp">XP</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </label>
          <span className="whitespace-nowrap rounded-md border border-success-border bg-success-soft px-2.5 py-[0.3rem] font-mono text-[0.65rem] font-bold uppercase text-success-text">Read only</span>
          {menu}
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2 min-[600px]:grid-cols-3 min-[1200px]:grid-cols-6" role="list">
        {sortedAttributes.map((attribute) => {
          const percent = xpPercent(attribute.xp, attribute.xpToNextLevel)
          const [color, soft] = attributeColors(attribute.key)
          const isSelected = selectedAttribute === attribute.key

          return (
            <li key={attribute.key}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onAttributeSelect?.(isSelected ? null : attribute.key)}
                className={`flex min-h-[8rem] w-full min-w-0 flex-col justify-between gap-1.5 rounded-[10px] border bg-surface p-2.5 text-left shadow-xs transition-[border-color,transform] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${isSelected ? 'border-brand' : 'border-border'}`}
                style={{ ['--attribute-color' as string]: color, ['--attribute-soft' as string]: soft }}
                data-attribute={attribute.key}
              >
              <div className="flex items-center justify-between gap-1">
                <span className="w-fit rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-bold tracking-[0.04em]" style={{ color, background: soft }}>{attribute.key}</span>
                <span className="font-mono text-[0.65rem] font-bold tabular-nums" style={{ color }}>LV {attribute.level}</span>
              </div>
              <h3 className="truncate text-sm text-text">{attribute.label}</h3>

              <div className="relative h-1.5 w-full overflow-hidden rounded-pill border border-border bg-surface-sunken" role="progressbar" aria-label={`${attribute.label} experience`} aria-valuenow={attribute.xp} aria-valuemin={0} aria-valuemax={attribute.xpToNextLevel} aria-valuetext={`${attribute.xp} of ${attribute.xpToNextLevel} XP, level ${attribute.level}`}>
                <div className="h-full rounded-[inherit] transition-[width] duration-200" style={{ width: `${percent}%`, backgroundColor: color }} />
              </div>

              <span className="flex flex-wrap justify-between gap-1 text-xs tabular-nums text-text-muted">
                {attribute.xp.toLocaleString()} XP
                <span className="font-semibold" style={{ color }}>{Math.round(percent)}% to next level</span>
              </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}