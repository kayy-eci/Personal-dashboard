import type { ReactNode } from 'react'

export interface SummaryItem {
  label: string
  value: string
  note: string
  tone?: 'violet' | 'sky' | 'emerald' | 'amber' | 'rose'
}

const toneBorder: Record<NonNullable<SummaryItem['tone']>, string> = {
  violet: '#7c3aed',
  sky: '#0284c7',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
}

export function SummaryGrid({ items }: { items: SummaryItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-4">
      {items.map((item) => (
        <div
          className="flex min-w-0 flex-col gap-[0.2rem] rounded-lg border border-border bg-surface-overlay p-3"
          style={item.tone ? { borderLeft: `3px solid ${toneBorder[item.tone]}` } : undefined}
          key={item.label}
        >
          <dt className="text-xs font-semibold text-text-muted">{item.label}</dt>
          <dd className="text-[1.3rem] font-bold leading-[1.2] tabular-nums text-text">{item.value}</dd>
          <span className="text-[0.6875rem] text-text-faint">{item.note}</span>
        </div>
      ))}
    </dl>
  )
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-border bg-[#f8fafc] p-3 text-xs leading-[1.5] text-[#475569]" role="note">
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#7dd3fc] text-[0.625rem] font-bold text-[#0369a1]" aria-hidden="true">i</span>
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
    <section className="min-w-0 scroll-mt-4 rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
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
      className="h-2 w-full overflow-hidden rounded-pill bg-[#e2e8f0]"
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
