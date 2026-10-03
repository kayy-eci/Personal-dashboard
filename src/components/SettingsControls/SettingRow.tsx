import { useId, type ReactNode } from 'react'

export interface SettingRowProps {
  label: string
  /** One line explaining the consequence of the setting. */
  help?: string
  /** The control. A radio group is labelled by this row automatically. */
  children: ReactNode
}

/**
 * One preference row: label and help text on the left, control on the right,
 * separated by a hairline divider. Stacks the control under the label on
 * narrow windows so nothing overflows.
 */
export function SettingRow({ label, help, children }: SettingRowProps) {
  const labelId = useId()

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t border-border pt-3 max-[560px]:grid-cols-1 max-[560px]:items-start"
    >
      <div className="min-w-0">
        <span id={labelId} className="block text-sm font-semibold text-text">
          {label}
        </span>
        {help && <span className="mt-0.5 block text-xs leading-[1.45] text-text-muted">{help}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2 max-[560px]:justify-start">{children}</div>
    </div>
  )
}
