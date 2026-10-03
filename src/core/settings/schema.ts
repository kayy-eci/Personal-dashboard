/** Defaults and validation for every settings key (section 9). */
export const DEFAULTS: Record<string, unknown> = {
  'appearance.theme': 'system',
  'appearance.accent': 'violet',
  'appearance.density': 'comfortable',
  'appearance.textSize': 'default',
  'appearance.reduceMotion': 'system',
  'calendar.weekStart': 'monday',
  focusMode: false,
  'ui.sidebarCollapsedGroups': [],
  'dashboard.hiddenSections': [],
  'health.max': 100,
  'health.lossPerMissedHabit': 5,
  'health.lossPerMissedQuest': 5,
  'health.recoveryAmount': 8,
  'health.recoveryDailyLimit': 2,
  'xp.formulaVersion': 1,
  'backup.autoEnabled': false,
  'app.firstRunDate': undefined,
  'health.lastCheckedDate': undefined,
  'backup.lastBackupAt': undefined,
  'backup.folderName': undefined,
  'storage.persistGranted': undefined,
  'github.username': undefined,
  'github.token': undefined,
}

const KNOWN_GROUPS = new Set(['daily', 'growth'])
const HIDDEN_IDS = new Set(['active-quests', 'next-milestone', 'deadlines', 'recent-activity', 'attributes'])

export function validateSetting(key: string, value: unknown): boolean {
  switch (key) {
    case 'appearance.theme':
      return ['light', 'dark', 'system'].includes(value as string)
    case 'appearance.accent':
      return ['violet', 'blue', 'teal', 'green', 'rose', 'slate'].includes(value as string)
    case 'appearance.density':
      return ['comfortable', 'compact'].includes(value as string)
    case 'appearance.textSize':
      return ['small', 'default', 'large'].includes(value as string)
    case 'appearance.reduceMotion':
      return ['system', 'on', 'off'].includes(value as string)
    case 'calendar.weekStart':
      return ['monday', 'sunday'].includes(value as string)
    case 'focusMode':
      return typeof value === 'boolean'
    case 'ui.sidebarCollapsedGroups':
      return Array.isArray(value) && value.every((v) => KNOWN_GROUPS.has(v as string))
    case 'dashboard.hiddenSections':
      return Array.isArray(value) && value.every((v) => HIDDEN_IDS.has(v as string))
    case 'health.max':
      return intIn(value, 10, 1000)
    case 'health.lossPerMissedHabit':
    case 'health.lossPerMissedQuest':
    case 'health.recoveryAmount':
      return intIn(value, 0, 100)
    case 'health.recoveryDailyLimit':
      return intIn(value, 0, 10)
    case 'xp.formulaVersion':
      return value === 1
    case 'backup.autoEnabled':
    case 'storage.persistGranted':
      return typeof value === 'boolean'
    case 'backup.lastBackupAt':
    case 'backup.folderName':
    case 'app.firstRunDate':
    case 'health.lastCheckedDate':
      return value === undefined || typeof value === 'string'
    case 'github.username':
      return value === undefined || (typeof value === 'string' && /^[a-zA-Z0-9-]{1,39}$/.test(value))
    case 'github.token':
      return value === undefined || typeof value === 'string'
    default:
      return false
  }
}

function intIn(v: unknown, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
}

export function getDefault(key: string): unknown {
  return DEFAULTS[key]
}

export function isKnownKey(key: string): boolean {
  return key in DEFAULTS
}
