/**
 * Preference schema: the option lists, their defaults, and the validation
 * that turns anything read from storage into a value the UI can trust.
 *
 * Keys are namespaced strings (`appearance.theme`, `dashboard.hiddenSections`,
 * …) because they map one-to-one onto rows in the backend `settings` table.
 */

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_OPTIONS)[number]
/** What a theme preference resolves to once the system preference is read. */
export type ResolvedTheme = 'light' | 'dark'

export const ACCENT_OPTIONS = ['violet', 'blue', 'teal', 'green', 'rose', 'slate'] as const
export type AccentId = (typeof ACCENT_OPTIONS)[number]

export const DENSITY_OPTIONS = ['comfortable', 'compact'] as const
export type Density = (typeof DENSITY_OPTIONS)[number]

export const TEXT_SIZE_OPTIONS = ['small', 'default', 'large'] as const
export type TextSize = (typeof TEXT_SIZE_OPTIONS)[number]

export const REDUCE_MOTION_OPTIONS = ['system', 'on', 'off'] as const
export type ReduceMotion = (typeof REDUCE_MOTION_OPTIONS)[number]

export const WEEK_START_OPTIONS = ['monday', 'sunday'] as const
export type WeekStart = (typeof WEEK_START_OPTIONS)[number]

export const SIDEBAR_GROUP_OPTIONS = ['daily', 'growth', 'system'] as const
export type SidebarGroupId = (typeof SIDEBAR_GROUP_OPTIONS)[number]

export const DASHBOARD_SECTION_OPTIONS = [
  'hud',
  'today',
  'active-quests',
  'next-milestone',
  'deadlines',
  'recent-activity',
  'attributes',
] as const
export type DashboardSectionId = (typeof DASHBOARD_SECTION_OPTIONS)[number]

/** `hud` and `today` stay on screen: they are what the user opens the app for. */
export const ALWAYS_VISIBLE_SECTIONS: readonly DashboardSectionId[] = ['hud', 'today']

export interface Preferences {
  theme: ThemePreference
  accent: AccentId
  density: Density
  textSize: TextSize
  reduceMotion: ReduceMotion
  weekStart: WeekStart
  focusMode: boolean
  sidebarCollapsedGroups: SidebarGroupId[]
  hiddenSections: DashboardSectionId[]
}

export type PreferenceKey = keyof Preferences

/** Namespaced storage keys, one per preference, mirroring `settings.key` rows. */
export const PREFERENCE_STORAGE_KEYS: Record<PreferenceKey, string> = {
  theme: 'pref:appearance.theme',
  accent: 'pref:appearance.accent',
  density: 'pref:appearance.density',
  textSize: 'pref:appearance.textSize',
  reduceMotion: 'pref:appearance.reduceMotion',
  weekStart: 'pref:calendar.weekStart',
  focusMode: 'pref:focusMode',
  sidebarCollapsedGroups: 'pref:ui.sidebarCollapsedGroups',
  hiddenSections: 'pref:dashboard.hiddenSections',
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  accent: 'violet',
  density: 'comfortable',
  textSize: 'default',
  reduceMotion: 'system',
  weekStart: 'monday',
  focusMode: false,
  sidebarCollapsedGroups: [],
  hiddenSections: [],
}

export interface AccentPreset {
  id: AccentId
  label: string
  /** Swatch fill — always passes 4.5:1 against a white label in both themes. */
  swatch: string
  light: { fill: string; text: string }
  dark: { fill: string; text: string }
}

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  {
    id: 'violet',
    label: 'Violet',
    swatch: '#6D28D9',
    light: { fill: '#6D28D9', text: '#5B21B6' },
    dark: { fill: '#7C3AED', text: '#C4B5FD' },
  },
  {
    id: 'blue',
    label: 'Blue',
    swatch: '#1D4ED8',
    light: { fill: '#1D4ED8', text: '#1E40AF' },
    dark: { fill: '#2563EB', text: '#93C5FD' },
  },
  {
    id: 'teal',
    label: 'Teal',
    swatch: '#0F766E',
    light: { fill: '#0F766E', text: '#115E59' },
    dark: { fill: '#0F766E', text: '#5EEAD4' },
  },
  {
    id: 'green',
    label: 'Green',
    swatch: '#15803D',
    light: { fill: '#15803D', text: '#166534' },
    dark: { fill: '#15803D', text: '#86EFAC' },
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#BE123C',
    light: { fill: '#BE123C', text: '#9F1239' },
    dark: { fill: '#E11D48', text: '#FDA4AF' },
  },
  {
    id: 'slate',
    label: 'Slate',
    swatch: '#475569',
    light: { fill: '#475569', text: '#334155' },
    dark: { fill: '#64748B', text: '#CBD5E1' },
  },
]

function oneOf<T extends readonly string[]>(options: T, value: unknown, fallback: T[number]): T[number] {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback
}

function membersOf<T extends string>(options: readonly T[], value: unknown, fallback: T[]): T[] {
  if (!Array.isArray(value)) return fallback
  const seen = new Set<T>()
  for (const entry of value) {
    if (typeof entry === 'string' && (options as readonly string[]).includes(entry)) {
      seen.add(entry as T)
    }
  }
  return [...seen]
}

/**
 * Validates one stored value. Unknown keys and invalid values fall back to the
 * default instead of throwing, so corrupt storage can never break startup.
 */
export function coercePreference<K extends PreferenceKey>(key: K, value: unknown): Preferences[K] {
  const fallback = DEFAULT_PREFERENCES[key]
  switch (key) {
    case 'theme':
      return oneOf(THEME_OPTIONS, value, fallback as ThemePreference) as Preferences[K]
    case 'accent':
      return oneOf(ACCENT_OPTIONS, value, fallback as AccentId) as Preferences[K]
    case 'density':
      return oneOf(DENSITY_OPTIONS, value, fallback as Density) as Preferences[K]
    case 'textSize':
      return oneOf(TEXT_SIZE_OPTIONS, value, fallback as TextSize) as Preferences[K]
    case 'reduceMotion':
      return oneOf(REDUCE_MOTION_OPTIONS, value, fallback as ReduceMotion) as Preferences[K]
    case 'weekStart':
      return oneOf(WEEK_START_OPTIONS, value, fallback as WeekStart) as Preferences[K]
    case 'focusMode':
      return (typeof value === 'boolean' ? value : fallback) as Preferences[K]
    case 'sidebarCollapsedGroups':
      return membersOf(SIDEBAR_GROUP_OPTIONS, value, fallback as SidebarGroupId[]) as Preferences[K]
    case 'hiddenSections':
      return membersOf(
        DASHBOARD_SECTION_OPTIONS.filter((id) => !ALWAYS_VISIBLE_SECTIONS.includes(id)),
        value,
        fallback as DashboardSectionId[],
      ) as Preferences[K]
  }
}

/** Validates a whole record, dropping unknown keys. */
export function coercePreferences(raw: unknown): Preferences {
  const result = { ...DEFAULT_PREFERENCES } as Preferences
  if (typeof raw !== 'object' || raw === null) return result
  const source = raw as Record<string, unknown>
  for (const key of Object.keys(PREFERENCE_STORAGE_KEYS) as PreferenceKey[]) {
    if (key in source) {
      Object.assign(result, { [key]: coercePreference(key, source[key]) })
    }
  }
  return result
}

/** The preferences that Settings → Display can restore. */
export const DISPLAY_KEYS = [
  'theme',
  'accent',
  'density',
  'textSize',
  'reduceMotion',
] as const satisfies readonly PreferenceKey[]

export type ResetScope = 'display' | 'all'
