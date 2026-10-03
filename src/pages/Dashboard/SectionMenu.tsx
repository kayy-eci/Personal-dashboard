import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import type { DashboardSectionId } from '../../preferences/schema'
import { isHideableSection, sectionLabel } from '../../preferences/sections'

export interface SectionMenuProps {
  sectionId: DashboardSectionId
  onHide: (id: DashboardSectionId) => void
}

/**
 * The "…" menu on a Dashboard section header.
 *
 * Only hideable sections get a Hide item — the player strip (`hud`) and the
 * habit checklist (`today`) are always on screen. The button is revealed on
 * hover, on keyboard focus and on touch devices, where hover never fires.
 */
export function SectionMenu({ sectionId, onHide }: SectionMenuProps) {
  if (!isHideableSection(sectionId)) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-text-muted opacity-0 transition-opacity hover:bg-surface-sunken hover:text-text focus-visible:opacity-100 group-hover/section:opacity-100 [@media(hover:none)]:opacity-100"
          aria-label={`${sectionLabel(sectionId)} options`}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <circle cx="10" cy="4" r="1.4" />
            <circle cx="10" cy="10" r="1.4" />
            <circle cx="10" cy="16" r="1.4" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-surface-overlay text-text">
        <DropdownMenuItem onSelect={() => onHide(sectionId)}>Hide section</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
