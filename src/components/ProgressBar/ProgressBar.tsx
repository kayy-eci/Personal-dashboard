export type ProgressTone = 'health' | 'xp' | 'neutral'

export interface ProgressBarProps {
  /** Accessible name, e.g. "Health". */
  label: string
  value: number
  max: number
  /** Visual + accessible description, e.g. "72 / 100 HP". */
  valueText: string
  tone?: ProgressTone
}

function percentOf(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, (value / max) * 100))
}

/**
 * Determinate progress meter.
 *
 * Uses `role="progressbar"` with the numeric value exposed via `aria-valuetext`
 * so screen readers announce "72 of 100" rather than a bare percentage — the
 * bar's colour is never the only signal.
 */
export function ProgressBar({
  label,
  value,
  max,
  valueText,
  tone = 'neutral',
}: ProgressBarProps) {
  const percent = percentOf(value, max)

  const fillClass =
    tone === 'health'
      ? 'bg-[#4a9d5b]'
      : tone === 'xp'
        ? 'bg-brand'
        : 'bg-text-faint'

  return (
    <div
      className="relative w-full h-2 overflow-hidden bg-surface-sunken border border-border rounded-pill"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={valueText}
    >
      <div className={`h-full rounded-[inherit] transition-[width] duration-200 ${fillClass}`} style={{ width: `${percent}%` }} />
    </div>
  )
}