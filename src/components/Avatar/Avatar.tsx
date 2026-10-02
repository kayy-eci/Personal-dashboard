import { useId, useRef } from 'react'
import { ImageIcon, TrashIcon } from '../icons/Icons'
import './Avatar.css'

export interface AvatarProps {
  /** Data URL of the current picture, or null when the slot is empty. */
  src: string | null
  /** Used for the fallback initial and the accessible name. */
  name: string
  selectFile: (file: File) => void
  clear: () => void
  error?: string | null
}

const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
].join(',')

/**
 * Profile picture slot with an initials fallback.
 *
 * Mirrors the reference template: a framed character portrait the user can
 * replace. Actions appear on hover and stay reachable via `:focus-within`.
 */
export function Avatar({ src, name, selectFile, clear, error }: AvatarProps) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  const openFilePicker = () => fileInputRef.current?.click()

  return (
    <div className="avatar">
      <div className="avatar__frame">
        {src ? (
          <img className="avatar__image" src={src} alt={`${name}'s profile picture`} />
        ) : (
          <div className="avatar__placeholder" role="img" aria-label="No profile picture set">
            <span className="avatar__initial" aria-hidden="true">
              {initial}
            </span>
          </div>
        )}

        <div className="avatar__actions">
          <button
            type="button"
            className="avatar__action"
            onClick={openFilePicker}
            aria-label={src ? `Change ${name}'s profile picture` : `Add a profile picture for ${name}`}
          >
            <ImageIcon className="avatar__action-icon" />
          </button>

          {src && (
            <button
              type="button"
              className="avatar__action"
              onClick={clear}
              aria-label={`Remove ${name}'s profile picture`}
            >
              <TrashIcon className="avatar__action-icon" />
            </button>
          )}
        </div>
      </div>

      <label className="avatar__label" htmlFor={fileInputId}>
        {src ? 'Change picture' : 'Add picture'}
      </label>
      <input
        ref={fileInputRef}
        id={fileInputId}
        className="sr-only"
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) selectFile(file)
          // Reset so re-picking the same file still fires a change event.
          event.target.value = ''
        }}
      />

      {error && (
        <p className="avatar__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}