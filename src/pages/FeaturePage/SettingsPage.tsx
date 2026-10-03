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
    <div className="flex w-full max-w-[100rem] mx-auto flex-col gap-4 p-4 min-[769px]:p-5 min-[769px]:pb-7 max-w-[1200px]">
      <div className="grid grid-cols-[minmax(0,230px)_minmax(0,1fr)] items-start gap-4 max-[820px]:grid-cols-1">
        <aside className="rounded-lg border border-border bg-surface-overlay p-4 max-[480px]:w-full" aria-label="Settings navigation">
          <h2 className="mb-3 text-lg text-text">Settings</h2>
          <nav className="flex flex-col gap-2" aria-label="Settings sections">
            <button type="button" className="min-h-9 rounded-md border border-border-strong bg-transparent px-3 py-2 text-left text-sm text-text-muted border-brand bg-brand text-brand-contrast">Profile</button>
            <button type="button" className="min-h-9 rounded-md border border-border-strong bg-transparent px-3 py-2 text-left text-sm text-text-muted">Display</button>
            <button type="button" className="min-h-9 rounded-md border border-border-strong bg-transparent px-3 py-2 text-left text-sm text-text-muted">Health rules</button>
            <button type="button" className="min-h-9 rounded-md border border-border-strong bg-transparent px-3 py-2 text-left text-sm text-text-muted">Data</button>
            <button type="button" className="min-h-9 rounded-md border border-border-strong bg-transparent px-3 py-2 text-left text-sm text-text-muted">Integrations</button>
            <button type="button" className="min-h-9 rounded-md border border-border-strong bg-transparent px-3 py-2 text-left text-sm text-text-muted">About</button>
          </nav>
        </aside>

        <main className="rounded-lg border border-border bg-surface-overlay p-4">
          <section className="rounded-lg border border-border bg-surface-overlay p-4 mt-4 first:mt-0">
            <div className="[&>h3]:text-base [&>h3]:font-bold [&>h3]:text-text">
              <h3>Display</h3>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label id="theme-label">Theme</label>
              <div
                className="flex flex-wrap items-center gap-2 text-text"
                role="group"
                aria-labelledby="theme-label"
              >
                <button
                  type="button"
                  className={`min-h-9 min-w-[4.5rem] rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-left text-sm text-text-muted${theme === 'light' ? ' border-brand bg-brand text-brand-contrast' : ''}`}
                  aria-pressed={theme === 'light'}
                  onClick={(event) => setTheme('light', event)}
                >
                  Light
                </button>
                <button
                  type="button"
                  className={`min-h-9 min-w-[4.5rem] rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-left text-sm text-text-muted${theme === 'dark' ? ' border-brand bg-brand text-brand-contrast' : ''}`}
                  aria-pressed={theme === 'dark'}
                  onClick={(event) => setTheme('dark', event)}
                >
                  Dark
                </button>
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label>Focus mode</label>
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
                <input type="checkbox" className="h-4 w-4" defaultChecked aria-label="Toggle focus mode" />
                <span>Hides game visuals. All habits, quests, and deadlines stay visible.</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface-overlay p-4 mt-4 first:mt-0">
            <div className="[&>h3]:text-base [&>h3]:font-bold [&>h3]:text-text">
              <h3>Health rules</h3>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label htmlFor="starting-vitality">Starting vitality</label>
              <div className="flex items-center gap-2 text-text">
                <input id="starting-vitality" className="min-h-10 w-full max-w-[18rem] rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text" type="number" defaultValue={100} />
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label htmlFor="max-vitality">Maximum vitality</label>
              <div className="flex items-center gap-2 text-text">
                <input id="max-vitality" className="min-h-10 w-full max-w-[18rem] rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text" type="number" defaultValue={100} />
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label htmlFor="missed-habit-loss">Loss per missed daily habit</label>
              <div className="flex items-center gap-2 text-text">
                <input id="missed-habit-loss" className="min-h-10 w-full max-w-[18rem] rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text" type="number" defaultValue={5} />
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label htmlFor="recovery-limit">Daily recovery quest limit</label>
              <div className="flex items-center gap-2 text-text">
                <input id="recovery-limit" className="min-h-10 w-full max-w-[18rem] rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text" type="number" defaultValue={2} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface-overlay p-4 mt-4 first:mt-0">
            <div className="[&>h3]:text-base [&>h3]:font-bold [&>h3]:text-text">
              <h3>Data</h3>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label>Backup actions</label>
              <div className="flex flex-wrap items-center gap-2 text-text">
                <button type="button" className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 ">Export data</button>
                <button type="button" className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover">Back up now</button>
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label>Data file</label>
              <div className="flex items-center gap-2 text-text">
                <code className="rounded-md border border-border bg-surface-sunken px-2 py-[0.4rem] font-mono text-xs text-text">C:\Users\Player\AppData\Roaming\LifeOS\lifeos.db</code>
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label>Last backup</label>
              <div className="flex items-center gap-2 text-text">
                <span className="font-semibold text-[#b45309]">Never</span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface-overlay p-4 mt-4 first:mt-0">
            <div className="[&>h3]:text-base [&>h3]:font-bold [&>h3]:text-text">
              <h3>Integrations</h3>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label htmlFor="github-user">GitHub username</label>
              <div className="flex items-center gap-2 text-text">
                <input
                  id="github-user"
                  className="min-h-10 w-full max-w-[18rem] rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text"
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
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
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
                  className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover"
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
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label htmlFor="github-token">Personal access token</label>
              <div className="flex flex-col items-start gap-2 text-text">
                <div className="flex items-center gap-2 text-text">
                  <input
                    id="github-token"
                    className="min-h-10 w-full max-w-[18rem] rounded-md border border-border-strong bg-surface-overlay px-[0.7rem] py-2 text-sm text-text"
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
                    className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60"
                    onClick={() => setShowToken((visible) => !visible)}
                    aria-pressed={showToken}
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-text">
                  <button
                    type="button"
                    className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60 border-brand bg-brand text-brand-contrast hover:border-brand-hover hover:bg-brand-hover"
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
                      className="inline-flex min-h-[2.4rem] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-overlay px-3 py-2 text-xs font-bold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-default disabled:opacity-60"
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
                <span>
                  Create at github.com/settings/tokens (classic, no scopes needed — or fine-grained with
                  read-only account access). Stored only in this browser. Anyone with device access could read
                  it — use a token you can revoke.
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface-overlay p-4 mt-4 first:mt-0">
            <div className="[&>h3]:text-base [&>h3]:font-bold [&>h3]:text-text">
              <h3>About</h3>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label>App version</label>
              <div className="flex items-center gap-2 text-text">
                <span>0.9.0</span>
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-center gap-3 border-t border-border pt-3 max-[820px]:grid-cols-1 max-[820px]:gap-2 [&>label]:text-sm [&>label]:font-semibold [&>label]:text-text-muted">
              <label>XP formula</label>
              <div className="flex items-center gap-2 text-text">
                <span>v1</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
