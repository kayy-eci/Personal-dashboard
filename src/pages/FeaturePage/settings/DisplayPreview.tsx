/**
 * Live preview strip for Settings → Display: one HUD meter, one habit row and
 * one primary button. It renders with the real tokens, so every appearance
 * change is visible without leaving the page.
 */
export function DisplayPreview() {
  return (
    <div className="rounded-lg border border-border bg-surface-secondary p-3" aria-label="Display preview">
      <p className="text-xs font-bold uppercase tracking-[0.04em] text-text-faint">Preview</p>
      <div className="mt-2 flex flex-wrap items-stretch gap-3 min-[720px]:flex-nowrap">
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1 rounded-md border border-border bg-surface p-2">
          <div className="flex justify-between gap-2 font-mono text-xs font-semibold text-text-muted">
            <span className="uppercase tracking-[0.04em]">Vitality</span>
            <span className="text-text">72 / 100 HP</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-pill border border-border bg-progress-track">
            <div className="h-full w-[72%] rounded-[inherit] bg-vitality" />
          </div>
        </div>

        <div className="flex min-w-[13rem] flex-1 items-center gap-2 rounded-md border border-border bg-surface p-2">
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-brand bg-brand text-xs font-bold leading-none text-brand-contrast"
          >
            ✓
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">Morning walk</span>
          <span className="whitespace-nowrap rounded-[5px] border border-xp/40 bg-xp-soft px-1.5 py-0.5 font-mono text-[0.65rem] font-bold text-xp">
            +5 XP
          </span>
        </div>

        <div className="flex min-w-[8rem] flex-1 items-center">
          <button
            type="button"
            className="inline-flex min-h-[var(--control-h)] w-full items-center justify-center rounded-md border border-brand bg-brand px-3 py-2 text-sm font-semibold text-brand-contrast transition-colors hover:border-brand-hover hover:bg-brand-hover"
          >
            Primary action
          </button>
        </div>
      </div>
    </div>
  )
}
