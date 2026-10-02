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

/** Checked circle — recurring routines (Habits & Routines). */
export function HabitsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="m6.75 10.25 2.25 2.25 4.25-4.75" />
    </SvgBase>
  )
}

/** Crossed blades — one-time objectives (Quests & Objectives). */
export function QuestsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M12.1 14.6 2.5 5V2.5H5l9.6 9.6" />
      <path d="m10.85 15.85 5-5" />
      <path d="m13.35 13.35 3 3" />
      <path d="m15.85 17.5 1.65-1.65" />
    </SvgBase>
  )
}

/** Banner — long-term targets (Goals & Milestones). */
export function GoalsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M3.35 12.5s.82-.83 3.32-.83 4.16 1.67 6.66 1.67 3.34-.84 3.34-.84V2.5s-.83.84-3.34.84S9.17 1.67 6.67 1.67 3.35 2.5 3.35 2.5Z" />
      <path d="M3.35 18.33v-5.83" />
    </SvgBase>
  )
}

/** Pulse trace — derived stats (Attributes & Stats). */
export function AttributesIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M18.33 10H15l-2.5 7.5-3.33-12.5-2.5 7.5H1.67" />
    </SvgBase>
  )
}

/** Counter-clockwise clock — the event feed (Timeline & Logs). */
export function TimelineIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M2.5 10a7.5 7.5 0 1 0 7.5-7.5 8.13 8.13 0 0 0-5.62 2.28L2.5 6.67" />
      <path d="M2.5 2.5v4.17h4.17" />
      <path d="M10 5.83V10l3.33 1.67" />
    </SvgBase>
  )
}

/** Column chart — trends (Analytics). */
export function AnalyticsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M2.5 2.5v13.33a1.67 1.67 0 0 0 1.67 1.67h13.33" />
      <path d="M15 14.17V7.5" />
      <path d="M10.83 14.17V4.17" />
      <path d="M6.67 14.17v-2.5" />
    </SvgBase>
  )
}

/** Framed picture — cover image / GIF slot. */
export function ImageIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m3 15 5-5 5 5" />
    </SvgBase>
  )
}

/** Wastebasket — clears the stored cover. */
export function TrashIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M3.5 5.5h13" />
      <path d="M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" />
      <path d="M5.5 5.5 6 16a1.5 1.5 0 0 0 1.5 1.4h5A1.5 1.5 0 0 0 14 16l.5-10.5" />
      <path d="M8.5 8.75v5.5M11.5 8.75v5.5" />
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
