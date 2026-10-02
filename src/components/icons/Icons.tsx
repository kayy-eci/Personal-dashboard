/**
 * Inline SVG icon set.
 *
 * Deliberately dependency-free: the project ships no icon library, so each
 * icon is a tiny component that inherits `currentColor` and is hidden from
 * assistive technology (decorative — the accessible name always lives on the
 * control that wraps the icon).
 */
import type { SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement>

function SvgBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Four-pane grid — the Dashboard nav glyph. */
export function DashboardIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
    </SvgBase>
  )
}

/** Hamburger — opens the sidebar drawer on small screens. */
export function MenuIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </SvgBase>
  )
}

/** Dismiss — closes the sidebar drawer. */
export function CloseIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M5 5l10 10M15 5L5 15" />
    </SvgBase>
  )
}

/** Small chevron — trailing affordance on the workspace / account rows. */
export function ChevronDownIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M5 7.5l5 5 5-5" />
    </SvgBase>
  )
}
