export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  /** Shared input name — gives the group native arrow-key navigation. */
  name: string
  value: T
  options: ReadonlyArray<SegmentedOption<T>>
  onChange: (value: T) => void
}

/**
 * Segmented control for a small set of mutually exclusive options.
 *
 * Built on real radio inputs sharing one `name`, so arrow keys, roving
 * tabindex and the selected state come from the platform. The visible pill is
 * the label; focus is drawn on it with the accent focus ring.
 */
export function SegmentedControl<T extends string>({
  name,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md border border-border bg-surface-sunken p-[0.2rem]">
      {options.map((option) => (
        <label key={option.value} className="relative inline-flex cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="inline-flex min-h-8 items-center rounded border border-transparent px-2.5 text-sm font-semibold text-text-muted transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-contrast peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-hover:text-text"
          >
            {option.label}
          </span>
          <span className="sr-only">{option.label}</span>
        </label>
      ))}
    </div>
  )
}
