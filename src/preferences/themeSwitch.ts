import { flushSync } from 'react-dom'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { motionSuppressed } from './apply'
import type { ReduceMotion } from './schema'

const FALLBACK_DURATION_MS = 480

export type ThemeSwitchOrigin =
  | { x: number; y: number }
  | MouseEvent
  | ReactMouseEvent<HTMLElement>

type ViewTransition = { ready: Promise<void>; finished: Promise<void> }
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition
}

function normalizeOrigin(origin?: ThemeSwitchOrigin): { x: number; y: number } | undefined {
  if (!origin) return undefined
  if ('clientX' in origin && 'clientY' in origin) {
    const { clientX, clientY } = origin as { clientX: number; clientY: number }
    return Number.isFinite(clientX) && Number.isFinite(clientY) ? { x: clientX, y: clientY } : undefined
  }
  const point = origin as { x?: number; y?: number }
  return Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x!, y: point.y! } : undefined
}

/**
 * Circular reveal for an appearance change, expanding from where the user
 * clicked. Falls back to a short colour cross-fade, and to an instant swap
 * when motion is reduced by preference or by the OS.
 */
export function animateAppearanceChange(
  update: () => void,
  origin: ThemeSwitchOrigin | undefined,
  reduceMotion: ReduceMotion,
): void {
  const root = document.documentElement
  const runUpdate = () => flushSync(update)

  if (motionSuppressed(reduceMotion)) {
    runUpdate()
    return
  }

  const doc = document as ViewTransitionDocument
  if (typeof doc.startViewTransition !== 'function') {
    root.classList.add('theme-animating')
    runUpdate()
    window.setTimeout(() => root.classList.remove('theme-animating'), FALLBACK_DURATION_MS)
    return
  }

  try {
    const transition = doc.startViewTransition(runUpdate)
    const point = normalizeOrigin(origin)
    const x = point?.x ?? window.innerWidth - 28
    const y = point?.y ?? 28
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 550,
            easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
            pseudoElement: '::view-transition-new(root)',
          } as KeyframeAnimationOptions & { pseudoElement: string },
        )
      })
      .catch(() => {
        // WAAPI rejected — the view transition itself still completes.
      })
  } catch {
    root.classList.add('theme-animating')
    runUpdate()
    window.setTimeout(() => root.classList.remove('theme-animating'), FALLBACK_DURATION_MS)
  }
}
