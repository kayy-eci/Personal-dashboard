import { useState } from 'react'
import { useGitHubActivity } from '../../hooks/useGitHubActivity'
import { useTheme } from '../../hooks/useTheme'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
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
  const [usernameDraft, setUsernameDraft] = useState(username)
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [tokenDraft, setTokenDraft] = useState('')
  const [tokenSaved, setTokenSaved] = useState(false)
  const [showToken, setShowToken] = useState(false)
  return (
    <div className="feature-page feature-page__content settings-page">
      <div className="settings-layout">
        <aside className="settings-sidebar" aria-label="Settings navigation">
          <h2>Settings</h2>
          <nav className="settings-nav" aria-label="Settings sections">
            <button type="button" className="settings-nav__item settings-nav__item--active">Profile</button>
            <button type="button" className="settings-nav__item">Display</button>
            <button type="button" className="settings-nav__item">Health rules</button>
            <button type="button" className="settings-nav__item">Data</button>
            <button type="button" className="settings-nav__item">Integrations</button>
            <button type="button" className="settings-nav__item">About</button>
          </nav>
        </aside>

        <main className="settings-content">
          <section className="settings-section">
            <div className="settings-section__header">
              <h3>Display</h3>
            </div>
            <div className="settings-row">
              <label id="theme-label">Theme</label>
              <div
                className="settings-row__control settings-row__control--segmented"
                role="group"
                aria-labelledby="theme-label"
              >
                <button
                  type="button"
                  className={`settings-pill${theme === 'light' ? ' settings-pill--active' : ''}`}
                  aria-pressed={theme === 'light'}
                  onClick={(event) => setTheme('light', event)}
                >
                  Light
                </button>
                <button
                  type="button"
                  className={`settings-pill${theme === 'dark' ? ' settings-pill--active' : ''}`}
                  aria-pressed={theme === 'dark'}
                  onClick={(event) => setTheme('dark', event)}
                >
                  Dark
                </button>
              </div>
            </div>
            <div className="settings-row">
              <label>Focus mode</label>
              <div className="settings-row__control settings-row__control--switch">
                <input type="checkbox" defaultChecked aria-label="Toggle focus mode" />
                <span>Hides game visuals. All habits, quests, and deadlines stay visible.</span>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section__header">
              <h3>Health rules</h3>
            </div>
            <div className="settings-row">
              <label htmlFor="starting-vitality">Starting vitality</label>
              <div className="settings-row__control">
                <input id="starting-vitality" type="number" defaultValue={100} />
              </div>
            </div>
            <div className="settings-row">
              <label htmlFor="max-vitality">Maximum vitality</label>
              <div className="settings-row__control">
                <input id="max-vitality" type="number" defaultValue={100} />
              </div>
            </div>
            <div className="settings-row">
              <label htmlFor="missed-habit-loss">Loss per missed daily habit</label>
              <div className="settings-row__control">
                <input id="missed-habit-loss" type="number" defaultValue={5} />
              </div>
            </div>
            <div className="settings-row">
              <label htmlFor="recovery-limit">Daily recovery quest limit</label>
              <div className="settings-row__control">
                <input id="recovery-limit" type="number" defaultValue={2} />
              </div>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section__header">
              <h3>Data</h3>
            </div>
            <div className="settings-row">
              <label>Backup actions</label>
              <div className="settings-row__control settings-row__control--buttons">
                <button type="button" className="feature-button feature-button--secondary">Export data</button>
                <button type="button" className="feature-button feature-button--primary">Back up now</button>
              </div>
            </div>
            <div className="settings-row">
              <label>Data file</label>
              <div className="settings-row__control">
                <code className="settings-code">C:\Users\Player\AppData\Roaming\LifeOS\lifeos.db</code>
              </div>
            </div>
            <div className="settings-row">
              <label>Last backup</label>
              <div className="settings-row__control">
                <span className="settings-warning">Never</span>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section__header">
              <h3>Integrations</h3>
            </div>
            <div className="settings-row">
              <label htmlFor="github-user">GitHub username</label>
              <div className="settings-row__control">
                <input
                  id="github-user"
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
            </div>
            <div className="settings-row">
              <label>Connection</label>
              <div className="settings-row__control settings-row__control--stack">
                <span className="settings-status">
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
                  <span className="settings-warning" role="alert">
                    {githubError}
                  </span>
                )}
                {usernameSaved && !githubError && (
                  <span className="settings-status" role="status">
                    Saved — activity grids now follow @{username}.
                  </span>
                )}
                <button
                  type="button"
                  className="feature-button feature-button--primary"
                  onClick={() => {
                    if (!usernameDraft.trim()) return
                    setUsername(usernameDraft)
                    setUsernameSaved(true)
                  }}
                >
                  Connect
                </button>
                <span>Hobby path: username only = public data. Add a token below for private contributions.</span>
              </div>
            </div>
            <div className="settings-row">
              <label htmlFor="github-token">Personal access token</label>
              <div className="settings-row__control settings-row__control--stack">
                <div className="settings-row__control">
                  <input
                    id="github-token"
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
                  <button
                    type="button"
                    className="feature-button"
                    onClick={() => setShowToken((visible) => !visible)}
                    aria-pressed={showToken}
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="settings-row__control settings-row__control--buttons">
                  <button
                    type="button"
                    className="feature-button feature-button--primary"
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
                      className="feature-button"
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
                  <span className="settings-status" role="status">
                    Token saved — grids now use exact counts incl. private contributions.
                  </span>
                )}
                <span>
                  Create at github.com/settings/tokens (classic, no scopes needed — or fine-grained with
                  read-only account access). Stored only in this browser. Anyone with device access could read
                  it — use a token you can revoke.
                </span>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section__header">
              <h3>About</h3>
            </div>
            <div className="settings-row">
              <label>App version</label>
              <div className="settings-row__control">
                <span>0.9.0</span>
              </div>
            </div>
            <div className="settings-row">
              <label>XP formula</label>
              <div className="settings-row__control">
                <span>v1</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
