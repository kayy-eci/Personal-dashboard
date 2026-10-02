import { useState } from 'react'
import { usePlayerStatus } from '../../features/player/usePlayerStatus'
import { AttributesPanel } from '../Dashboard/AttributesPanel/AttributesPanel'
import { DemoNotice, FeaturePanel, SummaryGrid } from './FeaturePage.shared'

const growthByPeriod = {
  '7d': [24, 42, 36, 58, 49, 75, 68],
  '30d': [32, 45, 40, 62, 55, 72, 81],
  '90d': [18, 29, 47, 43, 58, 69, 88],
} as const

type Period = keyof typeof growthByPeriod

export function AttributesPage() {
  const status = usePlayerStatus()
  const [period, setPeriod] = useState<Period>('7d')
  const totalAttributeXp = status.attributes.reduce((sum, attribute) => sum + attribute.xp, 0)
  const highestAttribute = [...status.attributes].sort((a, b) => b.level - a.level)[0]
  const selectedGrowth = growthByPeriod[period]

  return (
    <div className="feature-page feature-page__content">
      <DemoNotice>
        Attribute totals are illustrative. The real system will derive growth from verified habit and quest completions.
      </DemoNotice>
      <SummaryGrid
        items={[
          { label: 'Attributes', value: String(status.attributes.length), note: 'System-determined', tone: 'violet' },
          { label: 'Combined attribute XP', value: totalAttributeXp.toLocaleString(), note: 'Across all six attributes', tone: 'sky' },
          { label: 'Highest level', value: `Lv ${highestAttribute.level}`, note: highestAttribute.label, tone: 'amber' },
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
          <div className="feature-filter-group" role="group" aria-label="Growth history period">
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
        }
      >
        <div className="feature-attribute-history">
          {status.attributes.map((attribute, index) => (
            <div className="feature-attribute-history__row" key={attribute.key}>
              <span className="feature-attribute-history__key">{attribute.key}</span>
              <span className="feature-attribute-history__name">{attribute.label}</span>
              <div
                className="feature-attribute-history__track"
                role="img"
                aria-label={`${attribute.label} sample growth: ${selectedGrowth[index]} percent`}
              >
                <span style={{ width: `${selectedGrowth[index]}%` }} />
              </div>
              <strong>+{Math.round(selectedGrowth[index] / 5)}%</strong>
            </div>
          ))}
        </div>
      </FeaturePanel>
    </div>
  )
}
