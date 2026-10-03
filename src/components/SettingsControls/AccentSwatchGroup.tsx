import { Check } from 'lucide-react'
import { ACCENT_PRESETS, type AccentId } from '../../preferences/schema'

export interface AccentSwatchGroupProps {
  value: AccentId
  onChange: (value: AccentId) => void
}

/**
 * Radio group of the six accent presets.
 *
 * The selected swatch is marked with a check icon, never by colour alone, and
 * every swatch carries its preset name as an accessible label.
 */
export function AccentSwatchGroup({ value, onChange }: AccentSwatchGroupProps) {
  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap items-center gap-1.5">
      {ACCENT_PRESETS.map((accent) => {
        const selected = accent.id === value
        return (
          <label key={accent.id} className="relative inline-flex cursor-pointer">
            <input
              type="radio"
              name="appearance.accent"
              value={accent.id}
              checked={selected}
              onChange={() => onChange(accent.id)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              style={{ backgroundColor: accent.swatch }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-strong transition-transform peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-hover:scale-105"
            >
              {selected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
            </span>
            <span className="sr-only">{accent.label}</span>
          </label>
        )
      })}
    </div>
  )
}
