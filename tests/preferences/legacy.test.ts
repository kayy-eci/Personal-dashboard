/**
 * Legacy preference sanitizing (§8.4, §11): stored ids from the RPG era
 * (`hud`, `attributes`, `active-quests`, focus mode) must load without
 * crashing and come out cleaned.
 *
 * RED in Phase 1: `active-quests` is still a valid id (no mapping to
 * `active-tasks`), `attributes` is still kept, and `focusMode` still exists.
 */
import { describe, expect, it } from 'vitest'
import { coercePreferences, coercePreference } from '../../src/preferences/schema'

describe('legacy preference sanitizing', () => {
  it('maps hud → summary, active-quests → active-tasks, drops attributes', () => {
    const prefs = coercePreferences({
      hiddenSections: ['hud', 'attributes', 'active-quests', 'today', 'next-milestone', 'bogus'],
    })
    expect(prefs.hiddenSections).toContain('active-tasks')
    expect(prefs.hiddenSections).toContain('next-milestone')
    expect(prefs.hiddenSections).not.toContain('active-quests')
    expect(prefs.hiddenSections).not.toContain('attributes')
    expect(prefs.hiddenSections).not.toContain('hud')
    expect(prefs.hiddenSections).not.toContain('today')
    expect(prefs.hiddenSections).not.toContain('bogus')
  })

  it('drops the removed focusMode key and keeps kept keys untouched', () => {
    const prefs = coercePreferences({ focusMode: true, theme: 'dark', accent: 'blue' })
    expect(prefs).not.toHaveProperty('focusMode')
    expect(prefs.theme).toBe('dark')
    expect(prefs.accent).toBe('blue')
    expect(coercePreference('hiddenSections', 'not-an-array')).toEqual([])
  })
})
