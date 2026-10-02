import type { ReactNode } from 'react'

export interface SummaryItem {
  label: string
  value: string
  note: string
  tone?: 'violet' | 'sky' | 'emerald' | 'amber' | 'rose'
}

export function SummaryGrid({ items }: { items: SummaryItem[] }) {
  return (
    <dl className="feature-summary">
      {items.map((item) => (
        <div
          className={`feature-summary__item${item.tone ? ` feature-summary__item--${item.tone}` : ''}`}
          key={item.label}
        >
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          <span>{item.note}</span>
        </div>
      ))}
    </dl>
  )
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <p className="feature-demo-notice" role="note">
      <span aria-hidden="true">i</span>
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
    <section className="dashboard-panel feature-panel">
      <div className="dashboard-panel__header dashboard-panel__header--wrap">
        <div>
          <h2 className="dashboard-panel__title">{title}</h2>
          {description && <p className="dashboard-panel__description">{description}</p>}
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
      className="feature-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={`${Math.round(percent)}%`}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}
