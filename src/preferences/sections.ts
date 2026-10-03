import {
  ALWAYS_VISIBLE_SECTIONS,
  DASHBOARD_SECTION_OPTIONS,
  type DashboardSectionId,
} from './schema'

/**
 * Registry of Dashboard sections. The Dashboard renders from these ids so a
 * future layout builder can reorder or resize them without touching the
 * section components themselves.
 *
 * `hud` and `today` are not hideable: the player strip and the habit
 * checklist are the first things the user must see.
 */

export const DASHBOARD_SECTIONS: ReadonlyArray<{
  id: DashboardSectionId
  label: string
  hideable: boolean
}> = [
  { id: 'hud', label: 'Player status and meters', hideable: false },
  { id: 'today', label: "Today's habits", hideable: false },
  { id: 'active-quests', label: 'Active quests', hideable: true },
  { id: 'next-milestone', label: 'Next milestone', hideable: true },
  { id: 'deadlines', label: 'Deadlines', hideable: true },
  { id: 'recent-activity', label: 'Recent activity', hideable: true },
  { id: 'attributes', label: 'Core attributes', hideable: true },
]

const LABELS = new Map(DASHBOARD_SECTIONS.map((section) => [section.id, section.label]))

export function sectionLabel(id: DashboardSectionId): string {
  return LABELS.get(id) ?? id
}

export function isHideableSection(id: DashboardSectionId): boolean {
  return !ALWAYS_VISIBLE_SECTIONS.includes(id)
}

/** Ids that may appear in `dashboard.hiddenSections`, in display order. */
export const HIDEABLE_SECTION_IDS: readonly DashboardSectionId[] = DASHBOARD_SECTION_OPTIONS.filter(
  isHideableSection,
)
