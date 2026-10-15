import { useCallback, useEffect, useRef } from 'react'

interface UseAutoResizeTextareaProps {
  minHeight: number
  maxHeight?: number
}

/** Grows the composer textarea with its content, between min and max height. */
export function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.style.height = `${minHeight}px`
      if (reset) return
      const next = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY),
      )
      textarea.style.height = `${next}px`
    },
    [minHeight, maxHeight],
  )

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`
  }, [minHeight])

  useEffect(() => {
    const onResize = () => adjustHeight()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [adjustHeight])

  return { textareaRef, adjustHeight }
}
