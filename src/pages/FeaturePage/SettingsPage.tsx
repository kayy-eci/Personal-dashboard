import { useState } from 'react'
import { useGitHubActivity } from '../../hooks/useGitHubActivity'
import { usePlayerProfile } from '../../features/player/usePlayerProfile'
import { clearAllStoredValues, usePersistentState, writeStoredValue } from '../../lib/storage'
import { DisplaySettings } from './settings/DisplaySettings'

type SettingsSection = 'profile' | 'display' | 'health' | 'data' | 'integrations' | 'about'

const sections: { id: SettingsSection; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'display', label: 'Display' },
  { id: 'health', label: 'Health rules' },
  { id: 'data', label: 'Data' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'about', label: 'About' },
]

interface HealthRules {
  startingVitality: number
  maxVitality: number
  missedHabitLoss: number
  recoveryLimit: number
}

const DEFAULT_RULES: HealthRules = {
  startingVitality: 100,
  maxVitality: 100,
  missedHabitLoss: 5,
  recoveryLimit: 2,
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function SettingsPage() {
  const { profile, setName } = usePlayerProfile()
  const {
    username,
    setUsername,
    status: githubStatus,
    error: githubError,
    source: githubSource,
    hasToken,
    setToken,
    clearToken,
  } = useGitHubActivity()
  const [activeSection, setActiveSection] = usePersistentState<SettingsSection>('settings:section', 'profile')
  const [usernameDraft, setUsernameDraft] = useState(username)
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [tokenDraft, setTokenDraft] = useState('')
  const [tokenSaved, setTokenSaved] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [rules, setRules] = usePersistentState<HealthRules>('settings:health-rules', DEFAULT_RULES)
  const [lastBackup, setLastBackup] = usePersistentState<string | null>('settings:last-backup', null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [nameDraft, setNameDraft] = useState(profile.name)

  const updateRule = (key: keyof HealthRules, raw: string, min: number, max: number) => {
    setRules((current) => ({ ...current, [key]: clampNumber(Number(raw), min, max) }))
  }

  const exportData = () => {
    const dump: Record<string, string | null> = {}
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key) dump[key] = window.localStorage.getItem(key)
      }
    } catch {
      return
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const backUpNow = () => {
    exportData()
    const stamp = new Date().toISOString()
    setLastBackup(stamp)
    writeStoredValue('settings:last-backup', stamp)
  }

  const resetAll = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    clearAllStoredValues()
    window.location.reload()
  }

  const sectionButtonClass = (id: SettingsSection) =>
    `min-h-9 rounded-md border border-border-strong bg-transparent px-2.5 py-1.5 text-left text-sm text-text-muted${activeSection === id ? ' border-brand bg-brand text-brand-contrast' : ''}`

  const inputClass =
    'min-h-9 w-full max-w-[18rem] rounded-md border border-border-strong bg-surface-overlay px-2.5 py-1.5 text-sm text-text'
  const primaryButton =
    'inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover'
  const ghostButton =
    'inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60'
  const rowGrid =
    'grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted'
  const sectionClass = 'rounded-lg border border-border bg-surface-overlay p-3 mt-3 first:mt-0'

  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-3 p-3 pb-5 min-[769px]:p-4 min-[769px]:pb-6">
      <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-start gap-3 max-[820px]:grid-cols-1">
        <aside className="rounded-lg border border-border bg-surface-overlay p-3 max-[480px]:w-full" aria-label="Settings navigation">
          <h2 className="mb-2.5 text-lg text-text">Settings</h2>
          <nav className="flex flex-col gap-1.5 max-[820px]:flex-row max-[820px]:flex-wrap" aria-label="Settings sections">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={sectionButtonClass(section.id)}
                aria-pressed={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="rounded-lg border border-border bg-surface-overlay p-3">
          {activeSection === 'profile' && (
            <section className={sectionClass}>
              <h3 className="text-base font-bold text-text">Profile</h3>
              <div className={`${rowGrid} mt-3`}>
                <label htmlFor="player-name">Player name</label>
                <div className="flex items-center gap-2 text-text">
                  <input
                    id="player-name"
                    className={inputClass}
                    type="text"
                    value={nameDraft}
                    maxLength={40}
                    onChange={(event) => setNameDraft(event.target.value)}
                  />
                  <button
                    type="button"
                    className={primaryButton}
                    onClick={() => setName(nameDraft)}
                    disabled={!nameDraft.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-text-muted">
                Name and avatar are stored in this browser only.
              </p>
            </section>
          )}

          {activeSection === 'display' && <DisplaySettings />}

          {activeSection === 'health' && (
            <section className={sectionClass}>
              <h3 className="text-base font-bold text-text">Health rules</h3>
              <div className={`${rowGrid} mt-3`}>
                <label htmlFor="starting-vitality">Starting vitality</label>
                <input id="starting-vitality" className={inputClass} type="number" min={0} max={999} value={rules.startingVitality} onChange={(e) => updateRule('startingVitality', e.target.value, 0, 999)} />
              </div>
              <div className={rowGrid}>
                <label htmlFor="max-vitality">Maximum vitality</label>
                <input id="max-vitality" className={inputClass} type="number" min={1} max={999} value={rules.maxVitality} onChange={(e) => updateRule('maxVitality', e.target.value, 1, 999)} />
              </div>
              <div className={rowGrid}>
                <label htmlFor="missed-habit-loss">Loss per missed daily habit</label>
                <input id="missed-habit-loss" className={inputClass} type="number" min={0} max={100} value={rules.missedHabitLoss} onChange={(e) => updateRule('missedHabitLoss', e.target.value, 0, 100)} />
              </div>
              <div className={rowGrid}>
                <label htmlFor="recovery-limit">Daily recovery quest limit</label>
                <input id="recovery-limit" className={inputClass} type="number" min={0} max={10} value={rules.recoveryLimit} onChange={(e) => updateRule('recoveryLimit', e.target.value, 0, 10)} />
              </div>
              <button type="button" className={`${ghostButton} mt-3`} onClick={() => setRules(DEFAULT_RULES)}>
                Reset to defaults
              </button>
            </section>
          )}

          {activeSection === 'data' && (
            <section className={sectionClass}>
              <h3 className="text-base font-bold text-text">Data</h3>
              <div className={`${rowGrid} mt-3`}>
                <label>Backup actions</label>
                <div className="flex flex-wrap items-center gap-2 text-text">
                  <button type="button" className={ghostButton} onClick={exportData}>
                    Export data
                  </button>
                  <button type="button" className={primaryButton} onClick={backUpNow}>
                    Back up now
                  </button>
                </div>
              </div>
              <div className={rowGrid}>
                <label>Storage</label>
                <div className="flex items-center gap-2 text-text">
                  <code className="rounded-md border border-border bg-surface-sunken px-2 py-[0.4rem] font-mono text-xs text-text">
                    Browser localStorage (this device only)
                  </code>
                </div>
              </div>
              <div className={rowGrid}>
                <label>Last backup</label>
                <span className={lastBackup ? 'font-semibold text-text' : 'font-semibold text-[#b45309]'}>
                  {lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className={rowGrid}>
                <label>Reset</label>
                <div className="flex items-center gap-2 text-text">
                  <button type="button" className={ghostButton} onClick={resetAll}>
                    {confirmReset ? 'Click again to confirm reset' : 'Clear all local data'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'integrations' && (
            <section className={sectionClass}>
              <h3 className="text-base font-bold text-text">Integrations</h3>
              <div className={`${rowGrid} mt-3`}>
                <label htmlFor="github-user">GitHub username</label>
                <input
                  id="github-user"
                  className={inputClass}
                  type="text"
                  value={usernameDraft}
                  onChange={(event) => {
                    setUsernameDraft(event.target.value)
                    setUsernameSaved(false)
                  }}
                  placeholder="kayy-eci"
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>
              <div className={rowGrid}>
                <label>Connection</label>
                <div className="flex flex-col items-start gap-2 text-text">
                  <span className="text-text-muted">
                    {githubSource === 'graphql' && githubStatus === 'live'
                      ? `Authenticated as @${username} — exact counts incl. private`
                      : githubStatus === 'live'
                        ? `Connected as @${username} (public data)`
                        : githubStatus === 'cached'
                          ? `Cached data for @${username} — refreshing…`
                          : githubStatus === 'fallback'
                            ? `Using sample data for @${username}`
                            : `Connecting to @${username}…`}
                  </span>
                  {githubError && (
                    <span className="font-semibold text-[#b45309]" role="alert">
                      {githubError}
                    </span>
                  )}
                  {usernameSaved && !githubError && (
                    <span className="text-text-muted" role="status">
                      Saved — activity grids now follow @{username}.
                    </span>
                  )}
                  <button
                    type="button"
                    className={primaryButton}
                    onClick={() => {
                      if (!usernameDraft.trim()) return
                      setUsername(usernameDraft)
                      setUsernameSaved(true)
                    }}
                  >
                    Connect
                  </button>
                </div>
              </div>
              <div className={rowGrid}>
                <label htmlFor="github-token">Personal access token</label>
                <div className="flex flex-col items-start gap-2 text-text">
                  <div className="flex items-center gap-2 text-text">
                    <input
                      id="github-token"
                      className={inputClass}
                      type={showToken ? 'text' : 'password'}
                      value={tokenDraft}
                      onChange={(event) => {
                        setTokenDraft(event.target.value)
                        setTokenSaved(false)
                      }}
                      placeholder={hasToken ? 'Token saved — paste a new one to replace' : 'ghp_… or github_pat_…'}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button type="button" className={ghostButton} onClick={() => setShowToken((v) => !v)} aria-pressed={showToken}>
                      {showToken ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-text">
                    <button
                      type="button"
                      className={primaryButton}
                      disabled={!tokenDraft.trim()}
                      onClick={() => {
                        if (!tokenDraft.trim()) return
                        setToken(tokenDraft)
                        setTokenDraft('')
                        setTokenSaved(true)
                      }}
                    >
                      Save token
                    </button>
                    {hasToken && (
                      <button
                        type="button"
                        className={ghostButton}
                        onClick={() => {
                          clearToken()
                          setTokenDraft('')
                          setTokenSaved(false)
                        }}
                      >
                        Remove token
                      </button>
                    )}
                  </div>
                  {tokenSaved && !githubError && (
                    <span className="text-text-muted" role="status">
                      Token saved — grids now use exact counts incl. private contributions.
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'about' && (
            <section className={sectionClass}>
              <h3 className="text-base font-bold text-text">About</h3>
              <div className={`${rowGrid} mt-3`}>
                <label>App version</label>
                <span>0.9.0</span>
              </div>
              <div className={rowGrid}>
                <label>XP formula</label>
                <span>v1</span>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
