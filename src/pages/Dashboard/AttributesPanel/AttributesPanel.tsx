import { xpPercent, type PlayerStatus } from '../../../features/player/types'

export interface AttributesPanelProps {
  status: PlayerStatus
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
export function AttributesPanel({ status }: AttributesPanelProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="attributes-heading">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="attributes-heading" className="text-xl font-bold tracking-[-0.01em] text-text">
            Core attributes
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            System-computed from your completed activities
          </p>
        </div>
        <span className="whitespace-nowrap rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-[0.3rem] font-mono text-[0.65rem] font-bold uppercase text-[#047857]">Read only</span>
      </div>

      <ul className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-3 min-[1200px]:grid-cols-6" role="list">
        {status.attributes.map((attribute) => {
          const percent = xpPercent(attribute.xp, attribute.xpToNextLevel)
          const [color, soft] = attributeColors(attribute.key)

          return (
            <li
              key={attribute.key}
              className="flex min-h-[9.5rem] min-w-0 flex-col justify-between gap-2 rounded-[10px] border border-border bg-surface p-3 shadow-xs transition-[border-color,transform] hover:-translate-y-px"
              style={{ ['--attribute-color' as string]: color, ['--attribute-soft' as string]: soft }}
              data-attribute={attribute.key}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="w-fit rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-bold tracking-[0.04em]" style={{ color, background: soft }}>{attribute.key}</span>
                <span className="font-mono text-[0.65rem] font-bold tabular-nums" style={{ color }}>LV {attribute.level}</span>
              </div>
              <h3 className="truncate text-sm text-text">{attribute.label}</h3>

              <div className="relative h-2 w-full overflow-hidden rounded-pill border border-border bg-surface-sunken" role="progressbar" aria-label={`${attribute.label} experience`} aria-valuenow={attribute.xp} aria-valuemin={0} aria-valuemax={attribute.xpToNextLevel} aria-valuetext={`${attribute.xp} of ${attribute.xpToNextLevel} XP, level ${attribute.level}`}>
                <div className="h-full rounded-[inherit] transition-[width] duration-200" style={{ width: `${percent}%`, backgroundColor: color }} />
              </div>

              <span className="flex flex-wrap justify-between gap-1 text-xs tabular-nums text-text-muted">
                {attribute.xp.toLocaleString()} XP
                <span className="font-semibold" style={{ color }}>{Math.round(percent)}% to next level</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}