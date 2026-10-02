import { useId, useRef } from 'react'
import { ImageIcon, TrashIcon } from '../icons/Icons'
import { usePageCover } from './use-page-cover'
import './PageHeader.css'

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
    <header className="page-header">
      <div className="page-header__cover">
        {coverSrc ? (
          <>
            {/* Decorative banner — the page title carries the meaning. */}
            <img className="page-header__cover-image" src={coverSrc} alt="" />

            <div className="page-header__cover-actions">
              <button
                type="button"
                className="page-header__action"
                onClick={openFilePicker}
              >
                <ImageIcon className="page-header__action-icon" />
                <span>Change cover</span>
              </button>

              <button
                type="button"
                className="page-header__action"
                onClick={clearCover}
              >
                <TrashIcon className="page-header__action-icon" />
                <span>Remove</span>
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="page-header__cover-empty"
            onClick={openFilePicker}
          >
            <ImageIcon className="page-header__cover-empty-icon" />
            <span className="page-header__cover-empty-title">Add a cover</span>
            <span className="page-header__cover-empty-hint">
              Drop in an image or GIF
            </span>
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

      <div className="page-header__body">
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>

      {error && (
        <p className="page-header__error" role="alert">
          {error}
        </p>
      )}
    </header>
  )
}
