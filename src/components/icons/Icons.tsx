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

/** House — the Home / AI chat landing page. */
export function HomeIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M3 10.5 10 3.5l7 7" />
      <path d="M5.5 9.5V16.5h9V9.5" />
      <path d="M8.5 16.5v-4h3v4" />
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

/** Chevron right — collapsed group indicator. */
export function ChevronRightIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M7.5 5l5 5-5 5" />
    </SvgBase>
  )
}

/** Panel left — sidebar collapse toggle. */
export function PanelLeftIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="2.5" y="2.5" width="15" height="15" rx="1.5" />
      <path d="M7.5 2.5v15" />
    </SvgBase>
  )
}

/** Square plus — new task action. */
export function SquarePlusIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="2.5" y="2.5" width="15" height="15" rx="1.5" />
      <path d="M10 6.5v7M6.5 10h7" />
    </SvgBase>
  )
}

/** Magnifying glass — search. */
export function SearchIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="9" cy="9" r="6.5" />
      <path d="m17.5 17.5-4-4" />
    </SvgBase>
  )
}

/** Gear — settings. */
export function SettingsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 1.67v2.5M10 15.83v2.5M18.33 10h-2.5M4.17 10h-2.5M15.89 15.89l-1.77-1.77M5.88 5.88 4.11 4.11M15.89 4.11l-1.77 1.77M5.88 14.12 4.11 15.89" />
    </SvgBase>
  )
}

/** Sun — light theme. */
export function SunIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 1.67V3.5M10 16.5v1.83M18.33 10H16.5M3.5 10H1.67M15.36 15.36l-1.3-1.3M5.94 5.94l-1.3-1.3M15.36 4.64l-1.3 1.3M5.94 14.06l-1.3 1.3" />
    </SvgBase>
  )
}

/** Moon — dark theme. */
export function MoonIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M17.5 11.25A7.5 7.5 0 1 1 8.75 2.5a6 6 0 0 0 8.75 8.75Z" />
    </SvgBase>
  )
}

/** User circle — profile/character. */
export function UserRoundIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <circle cx="10" cy="8.5" r="2.5" />
      <path d="M4.64 15.36a5 5 0 0 1 10.72 0" />
    </SvgBase>
  )
}

/** Calendar — scheduling. */
export function CalendarIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="2.5" y="4.17" width="15" height="13.33" rx="1.5" />
      <path d="M6.67 2.5v3.33M13.33 2.5v3.33M2.5 8.33h15" />
    </SvgBase>
  )
}

/** GitHub logo. */
export function GitHubIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M10 1.67a8.33 8.33 0 0 0-2.63 16.23c.41.08.56-.18.56-.39v-1.39c-2.32.5-2.81-1.12-2.81-1.12a2.21 2.21 0 0 0-.93-1.22c-.75-.52.06-.51.06-.51a1.76 1.76 0 0 1 1.28.86 1.78 1.78 0 0 0 2.44.7 1.79 1.79 0 0 1 .53-1.11c-1.87-.21-3.84-.94-3.84-4.17a3.26 3.26 0 0 1 .87-2.26 3.03 3.03 0 0 1 .08-2.23s.71-.23 2.33.87a8.02 8.02 0 0 1 4.24 0c1.62-1.1 2.33-.87 2.33-.87a3.03 3.03 0 0 1 .08 2.23 3.26 3.26 0 0 1 .87 2.26c0 3.24-1.97 3.96-3.85 4.17a2 2 0 0 1 .57 1.55v2.3c0 .21.14.47.57.39A8.33 8.33 0 0 0 10 1.67Z" />
    </SvgBase>
  )
}

/** Checkbox — tasks/quests. */
export function CheckSquareIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="2.5" y="2.5" width="15" height="15" rx="1.5" />
      <path d="m6 10 2.5 2.5 5-5.5" />
    </SvgBase>
  )
}

/** Message bubble — chat. */
export function MessageSquareIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M17.5 13.33A1.67 1.67 0 0 1 15.83 15H6.67L2.5 17.5v-13.33A1.67 1.67 0 0 1 4.17 2.5h11.66a1.67 1.67 0 0 1 1.67 1.67Z" />
    </SvgBase>
  )
}
