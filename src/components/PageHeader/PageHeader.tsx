import { useId, useRef } from 'react'
import { ImageIcon, TrashIcon } from '../icons/Icons'
import { usePageCover } from './use-page-cover'

export interface PageHeaderProps {
  /** Storage key for this page's cover — must be unique per page. */
  pageId: string
  title: string
  /** Optional supporting line under the title. */
  subtitle?: string
}

/**
 * Top band shared by every page: a cover image / GIF slot, then the page
 * title — mirroring the reference design (design/image.png).
 *
 * Every page renders this, so no page can ship without a cover slot. Covers
 * are per-page and persist in localStorage; there is no backend yet (PRD §8).
 */
export function PageHeader({ pageId, title, subtitle }: PageHeaderProps) {
  const { src: coverSrc, selectFile, clear: clearCover, error } =
    usePageCover(pageId)
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openFilePicker = () => fileInputRef.current?.click()

  return (
    <header className="flex flex-col bg-surface">
      <div className="group relative flex h-75 items-center justify-center overflow-hidden border-b border-border bg-surface-sunken max-md:h-[clamp(4.5rem,20vw,6.5rem)]">
        {coverSrc ? (
          <>
            {/* Decorative banner — the page title carries the meaning. */}
            <img className="h-full w-full object-cover" src={coverSrc} alt="" />

            <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition-opacity duration-120 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-border-strong bg-surface px-3 py-1 text-sm text-text shadow-xs transition-colors hover:bg-surface-sunken hover:border-text-faint"
                onClick={openFilePicker}
              >
                <ImageIcon className="h-[0.9375rem] w-[0.9375rem] text-text-muted" />
                <span className="max-md:hidden">Change cover</span>
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-border-strong bg-surface px-3 py-1 text-sm text-text shadow-xs transition-colors hover:bg-surface-sunken hover:border-text-faint"
                onClick={clearCover}
              >
                <TrashIcon className="h-[0.9375rem] w-[0.9375rem] text-text-muted" />
                <span className="max-md:hidden">Remove</span>
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="flex h-full w-full flex-col items-center justify-center gap-1 bg-transparent p-3 text-text-faint transition-colors hover:text-text-muted"
            onClick={openFilePicker}
          >
            <ImageIcon className="mb-1 h-6 w-6" />
            <span className="text-sm font-medium">Add a cover</span>
            <span className="text-xs text-text-faint">Drop in an image or GIF</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          id={fileInputId}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) selectFile(file)
            // Reset so picking the same file twice still fires a change event.
            event.target.value = ''
          }}
        />
      </div>

      <div className="flex flex-col gap-0.5 px-4 pb-1.5 pt-3 max-md:px-3 max-md:pb-1.5 max-md:pt-2.5">
        <h1 className="text-xl font-bold tracking-[-0.02em] text-text">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </div>

      {error && (
        <p className="px-4 pb-2 pt-1.5 text-sm text-danger max-md:px-3" role="alert">
          {error}
        </p>
      )}
    </header>
  )
}
