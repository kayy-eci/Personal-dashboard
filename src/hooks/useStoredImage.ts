import { useCallback, useState } from 'react'

/**
 * Shared behaviour for user-supplied images (page covers, profile picture).
 *
 * Images are stored as data URLs in localStorage so they survive a reload
 * without needing a backend — the PRD leaves backend/DB undecided (§8). That
 * caps practical file size: browsers give roughly 5 MB per origin, and base64
 * encoding adds ~33% on top.
 */
const MAX_FILE_BYTES = 2 * 1024 * 1024

export interface StoredImage {
  /** Data URL of the current image, or null when the slot is empty. */
  src: string | null
  /** Validates, stores and applies a picked file. */
  selectFile: (file: File) => void
  /** Removes the image from state and storage. */
  clear: () => void
  /** Human-readable problem with the last attempted selection. */
  error: string | null
}

export function readStoredImage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Private browsing / disabled storage — fall back to empty.
    return null
  }
}

/**
 * Reads, validates and persists one image under `key`.
 *
 * Storage failures are non-fatal by design: the image still renders for the
 * session and `error` explains that it will not persist. Silently dropping it
 * would look like a broken upload.
 */
export function useStoredImage(key: string, label = 'image'): StoredImage {
  const [src, setSrc] = useState<string | null>(() => readStoredImage(key))
  const [error, setError] = useState<string | null>(null)

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Nothing to do — the in-memory image is dropped regardless.
    }
    setSrc(null)
    setError(null)
  }, [key])

  const selectFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('That file is not an image. Choose a PNG, JPG, or GIF.')
        return
      }

      if (file.size > MAX_FILE_BYTES) {
        setError(`That ${label} is over 2 MB and cannot be saved in the browser.`)
        return
      }

      const reader = new FileReader()

      reader.onerror = () => setError('That file could not be read.')
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : null

        if (!dataUrl) {
          setError('That file could not be read.')
          return
        }

        setSrc(dataUrl)
        setError(null)

        try {
          window.localStorage.setItem(key, dataUrl)
        } catch {
          setError(
            'Applied for this session only — the browser refused to store it.',
          )
        }
      }

      reader.readAsDataURL(file)
    },
    [key, label],
  )

  return { src, selectFile, clear, error }
}