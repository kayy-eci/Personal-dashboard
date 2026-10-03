import type { ReactNode } from 'react'

export interface SummaryItem {
  label: string
  value: string
  note: string
  tone?: 'gold' | 'sky' | 'emerald' | 'ember' | 'rose'
}

const toneBorder: Record<NonNullable<SummaryItem['tone']>, string> = {
  gold: 'var(--goal-gold)',
  sky: 'var(--goal-blue)',
  emerald: 'var(--success-text)',
  ember: 'var(--attr-creat)',
  rose: 'var(--goal-rose)',
}

export function SummaryGrid({ items }: { items: SummaryItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 min-[600px]:grid-cols-4">
      {items.map((item) => (
        <div
          className="flex min-w-0 flex-col gap-[0.15rem] rounded-lg border border-border bg-surface-overlay p-2.5"
          style={item.tone ? { borderLeft: `3px solid ${toneBorder[item.tone]}` } : undefined}
          key={item.label}
        >
          <dt className="text-xs font-semibold text-text-muted">{item.label}</dt>
          <dd className="text-[1.2rem] font-bold leading-[1.15] tabular-nums text-text">{item.value}</dd>
          <span className="text-[0.6875rem] text-text-faint">{item.note}</span>
        </div>
      ))}
    </dl>
  )
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-border bg-[var(--attr-soft)] p-2.5 text-xs leading-[1.45] text-[var(--text-muted)]" role="note">
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--info-border)] text-[0.625rem] font-bold text-[var(--info-text)]" aria-hidden="true">i</span>
      {children}
    </p>
  )
}

export function FeaturePanel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="min-w-0 scroll-mt-4 rounded-xl border border-border bg-surface p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-2.5">
        <div>
          <h2 className="text-lg font-bold leading-[1.3] text-text">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-[1.45] text-text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ProgressTrack({
  label,
  value,
  max = 100,
}: {
  label: string
  value: number
  max?: number
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-pill bg-[var(--attr-soft)]"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={`${Math.round(percent)}%`}
    >
      <span className="block h-full rounded-[inherit] bg-brand transition-[width] duration-200" style={{ width: `${percent}%` }} />
    </div>
  )
}
