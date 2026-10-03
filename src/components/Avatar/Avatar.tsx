import { useId, useRef } from 'react'
import { ImageIcon, TrashIcon } from '../icons/Icons'

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
    <div className="flex flex-col items-center gap-2">
      <div className="group relative h-40 w-40 overflow-hidden rounded-lg border border-border-strong bg-surface-sunken shadow-xs">
        {src ? (
          <img className="h-full w-full object-cover" src={src} alt={`${name}'s profile picture`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-sunken to-[#eceae4]" role="img" aria-label="No profile picture set">
            <span className="text-[2.75rem] font-semibold leading-none text-text-faint" aria-hidden="true">
              {initial}
            </span>
          </div>
        )}

        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 transition-opacity duration-120 max-md:opacity-100 group-hover:opacity-100 focus-within:opacity-100 [:hover]:opacity-100 has-[:focus-visible]:opacity-100">
          <button
            type="button"
            className="inline-flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-md border border-border-strong bg-surface-overlay/95 text-text shadow-xs transition-colors hover:bg-surface-overlay hover:border-text-faint"
            onClick={openFilePicker}
            aria-label={src ? `Change ${name}'s profile picture` : `Add a profile picture for ${name}`}
          >
            <ImageIcon className="h-[1.0625rem] w-[1.0625rem] text-text-muted" />
          </button>

          {src && (
            <button
              type="button"
              className="inline-flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-md border border-border-strong bg-surface-overlay/95 text-text shadow-xs transition-colors hover:bg-surface-overlay hover:border-text-faint"
              onClick={clear}
              aria-label={`Remove ${name}'s profile picture`}
            >
              <TrashIcon className="h-[1.0625rem] w-[1.0625rem] text-text-muted" />
            </button>
          )}
        </div>
      </div>

      <label className="cursor-pointer text-center text-xs text-text-muted hover:text-text hover:underline" htmlFor={fileInputId}>
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
        <p className="max-w-[14rem] text-center text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}