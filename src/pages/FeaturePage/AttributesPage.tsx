import { useState } from 'react'
import { usePlayerStatus } from '../../features/player/usePlayerStatus'
import { AttributesPanel } from '../Dashboard/AttributesPanel/AttributesPanel'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'
import { usePersistentState } from '../../lib/storage'

const growthByPeriod = {
  '7d': [24, 42, 36, 58, 49, 75, 68],
  '30d': [32, 45, 40, 62, 55, 72, 81],
  '90d': [18, 29, 47, 43, 58, 69, 88],
} as const

type Period = keyof typeof growthByPeriod

export function AttributesPage() {
  const status = usePlayerStatus()
  const [period, setPeriod] = usePersistentState<Period>('attributes:period', '7d')
  const [sort, setSort] = useState('level')
  const totalAttributeXp = status.attributes.reduce((sum, attribute) => sum + attribute.xp, 0)
  const highestAttribute = [...status.attributes].sort((a, b) => b.level - a.level)[0]
  const selectedGrowth = growthByPeriod[period]
  const sortedAttributes = status.attributes
    .map((attribute, index) => ({ attribute, growth: selectedGrowth[index] ?? 0 }))
    .sort((a, b) => {
      if (sort === 'level') return b.attribute.level - a.attribute.level
      if (sort === 'growth') return b.growth - a.growth
      return a.attribute.label.localeCompare(b.attribute.label)
    })

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 p-3 pb-5 min-[769px]:p-4 min-[769px]:pb-6">
      <DemoNotice>
        Attribute totals are illustrative. The real system will derive growth from verified habit and quest completions.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Attributes', value: String(status.attributes.length), note: 'System-determined', tone: 'gold' },
          { label: 'Combined attribute XP', value: totalAttributeXp.toLocaleString(), note: 'Across all six attributes', tone: 'sky' },
          { label: 'Highest level', value: `Lv ${highestAttribute.level}`, note: highestAttribute.label, tone: 'ember' },
          { label: 'Tracking window', value: period.toUpperCase(), note: 'Sample growth history', tone: 'emerald' },
        ]}
      />

      <FeaturePanel title="Attribute profile" description="Read-only stats grown through completed activities.">
        <AttributesPanel status={status} />
      </FeaturePanel>

      <FeaturePanel
        title="Growth history"
        description="Relative sample attribute activity during the selected period."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem] [&>button]:rounded [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:px-[0.55rem] [&>button]:py-[0.35rem] [&>button]:text-xs [&>button]:font-semibold [&>button]:text-text-muted hover:[&>button]:text-text [&>button[aria-pressed=true]]:border-border [&>button[aria-pressed=true]]:bg-surface-overlay [&>button[aria-pressed=true]]:text-text [&>button[aria-pressed=true]]:shadow-xs" role="group" aria-label="Growth history period">
              {(['7d', '30d', '90d'] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={period === option}
                  onClick={() => setPeriod(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              Sort
              <select
                className="min-h-[var(--control-h)] rounded-md border border-border-strong bg-surface-overlay px-[var(--pad-x)] py-[var(--pad-y)] text-sm text-text focus-visible:outline-2 focus-visible:outline-brand"
                aria-label="Sort attributes"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="level">Level (desc)</option>
                <option value="growth">Growth (desc)</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </label>
          </div>
        }
      >
        <div className="mt-4 flex flex-col gap-3">
          {sortedAttributes.map(({ attribute, growth }) => (
            <div className="grid grid-cols-[3rem_minmax(5rem,0.8fr)_minmax(4rem,2fr)_2.5rem] items-center gap-2 max-[480px]:grid-cols-[2.5rem_minmax(3.5rem,0.8fr)_minmax(3rem,1.5fr)_2rem] max-[480px]:gap-1" key={attribute.key}>
              <span className="w-fit rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.65rem] font-bold text-text-muted">{attribute.key}</span>
              <span className="text-xs text-text-muted">{attribute.label}</span>
              <div
                className="h-[0.45rem] overflow-hidden rounded-pill bg-[var(--attr-soft)]"
                role="img"
                aria-label={`${attribute.label} sample growth: ${growth} percent`}
              >
                <span className="block h-full rounded-[inherit] bg-brand" style={{ width: `${growth}%` }} />
              </div>
              <strong className="text-right font-mono text-[0.65rem] text-[var(--success-text)]">+{Math.round(growth / 5)}%</strong>
            </div>
          ))}
        </div>
      </FeaturePanel>
    </div>
  )
}
