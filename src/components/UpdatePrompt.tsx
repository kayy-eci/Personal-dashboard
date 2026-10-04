import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-3 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface-overlay px-4 py-3 shadow-md" role="status" aria-live="polite">
      <p className="text-sm text-text">A new version is ready. Reload to update.</p>
      <button
        type="button"
        className="rounded-md border border-brand bg-brand px-3 py-1.5 text-xs font-bold uppercase tracking-[0.035em] text-brand-contrast"
        onClick={() => void updateServiceWorker(true)}
      >
        Reload
      </button>
      <button
        type="button"
        aria-label="Dismiss update prompt"
        className="text-text-muted"
        onClick={() => setNeedRefresh(false)}
      >
        ×
      </button>
    </div>
  )
}
