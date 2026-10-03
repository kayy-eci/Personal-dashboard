import { useState } from 'react'
import { AccentSwatchGroup } from '../../../components/SettingsControls/AccentSwatchGroup'
import { SegmentedControl } from '../../../components/SettingsControls/SegmentedControl'
import { SettingRow } from '../../../components/SettingsControls/SettingRow'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { sectionLabel } from '../../../preferences/sections'
import {
  DASHBOARD_SECTION_OPTIONS,
  DENSITY_OPTIONS,
  THEME_OPTIONS,
  type DashboardSectionId,
  type Density,
  type ThemePreference,
} from '../../../preferences/schema'
import { usePreferences } from '../../../preferences/usePreferences'
import { DisplayPreview } from './DisplayPreview'

const themeLabels: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const densityLabels: Record<Density, string> = {
  comfortable: 'Comfortable',
  compact: 'Compact',
}

const ghostButton =
  'inline-flex min-h-[var(--control-h)] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text'

/**
 * Settings → Display. Every control applies the moment it changes — there is
 * no save button, so each row writes straight through the preferences store.
 */
export function DisplaySettings() {
  const {
    preferences,
    setPreference,
    resetDisplayPreferences,
    restoreSection,
    saveError,
    retrySave,
  } = usePreferences()
  const [confirmReset, setConfirmReset] = useState(false)
  const hiddenSections = DASHBOARD_SECTION_OPTIONS.filter((id) =>
    preferences.hiddenSections.includes(id),
  )

  return (
    <section className="rounded-lg border border-border bg-surface-overlay p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-text">Display</h3>
        <button type="button" className={ghostButton} onClick={() => setConfirmReset(true)}>
          Reset display settings
        </button>
      </div>

      {saveError && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-danger-border bg-danger-soft px-3 py-2"
        >
          <span className="text-xs font-semibold text-danger-text">
            Couldn&apos;t save this setting. It will reset when you close the app.
          </span>
          <button type="button" className={ghostButton} onClick={retrySave}>
            Retry
          </button>
        </div>
      )}

      <div className="mt-3">
        <DisplayPreview />
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <SettingRow label="Theme" help="System follows your operating system setting.">
          <SegmentedControl
            name="appearance.theme"
            value={preferences.theme}
            options={THEME_OPTIONS.map((value) => ({ value, label: themeLabels[value] }))}
            onChange={(value) => setPreference('theme', value)}
          />
        </SettingRow>

        <SettingRow
          label="Accent colour"
          help="Used for primary buttons, the selected sidebar item, the level chip, links and focus rings. Attributes, vitality, XP and status colours never change."
        >
          <AccentSwatchGroup
            value={preferences.accent}
            onChange={(value) => setPreference('accent', value)}
          />
        </SettingRow>

        <SettingRow label="Density" help="Row height and spacing. Text size stays the same.">
          <SegmentedControl
            name="appearance.density"
            value={preferences.density}
            options={DENSITY_OPTIONS.map((value) => ({ value, label: densityLabels[value] }))}
            onChange={(value) => setPreference('density', value)}
          />
        </SettingRow>

        <SettingRow
          label="Focus mode"
          help="Hides game visuals. All habits, quests, and deadlines stay visible."
        >
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={preferences.focusMode}
              onChange={(event) => setPreference('focusMode', event.target.checked)}
            />
            <span>{preferences.focusMode ? 'On' : 'Off'}</span>
          </label>
        </SettingRow>

        <SettingRow
          label="Hidden sections"
          help="Dashboard sections you hid. Restore any of them here."
        >
          {hiddenSections.length === 0 ? (
            <span className="text-sm text-text-muted">No hidden sections.</span>
          ) : (
            <ul className="flex flex-col items-start gap-1.5" role="list">
              {hiddenSections.map((id: DashboardSectionId) => (
                <li key={id} className="flex items-center gap-2">
                  <span className="text-sm text-text">{sectionLabel(id)}</span>
                  <button type="button" className={ghostButton} onClick={() => restoreSection(id)}>
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SettingRow>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="bg-surface-overlay text-text">
          <DialogHeader>
            <DialogTitle>Reset display settings?</DialogTitle>
            <DialogDescription className="text-text-muted">
              Theme, accent, density, text size and motion go back to their defaults. Your sidebar
              groups, hidden sections and focus mode stay as they are.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={ghostButton} onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex min-h-[var(--control-h)] items-center justify-center gap-2 rounded-md border border-brand bg-brand px-3 py-2 text-xs font-bold text-brand-contrast transition-colors hover:border-brand-hover hover:bg-brand-hover"
              onClick={() => {
                resetDisplayPreferences()
                setConfirmReset(false)
              }}
            >
              Reset
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
