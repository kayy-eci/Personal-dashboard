import { useStoredImage, type StoredImage } from '../../hooks/useStoredImage'

function storageKey(pageId: string) {
  return `lifeos:cover:${pageId}`
}

export type PageCover = StoredImage

/** Owns the cover image / GIF for one page. */
export function usePageCover(pageId: string): PageCover {
  return useStoredImage(storageKey(pageId), 'cover')
}
