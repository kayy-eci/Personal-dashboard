# RPG removal inventory (temporary — deleted in Phase 9)

Branch: `refactor/remove-rpg` (git-skill convention `refactor/<desc>` wins over the brief's `remove-rpg`).
Tag: `pre-rpg-removal` on `d35533a`.
Skills map: see Phase 0 report (chat). Skills fully read: git-workflow-and-versioning,
frontend-ui-engineering, test-driven-development, deprecation-and-migration,
documentation-and-adrs. No skill conflicts found.

Working tree was NOT clean at start (user WIP, left untouched, never committed):
modified `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`;
untracked `src-tauri/`, `public/pwa-*.png`.
`src-tauri/` is a default Tauri scaffold (no domain code) — no Rust changes needed.

Migration branch: **Dexie 8.2** (IndexedDB, versioned `db.version(n)`) + **8.3**
(export/import, `schemaVersion` 1→2 with legacy-migration on import). No SQLite, no Rust backend.

Legend: REMOVE = delete | RENAME = quest→task etc. | REWRITE = strip RPG, keep feature.

## Core DB (`src/core/db/`)
| location | what | decision | reason |
|---|---|---|---|
| `db.ts` LifeOSDb | tables `attributeStats`, `xpLedger`, `healthLogs`, `achievements`, `quests` | REMOVE (v2 copy quests→tasks, v3 drop) | RPG stores |
| `db.ts` | `LEDGER_GUARD` + append-only hooks | REMOVE | ledger gone |
| `db.ts` | `seedDatabase` (attribute + achievement seeds) | REMOVE + drop call in `Root.tsx` | RPG seeds |
| `db.ts` | `habits` `*attributes` index | REMOVE index | attribute links gone |
| `db.ts` | `tasks` table (ex-quests minus type/difficulty/effort/impact/baseXp/attributes) | RENAME+REWRITE | quests→tasks |
| `types.ts` | `Attribute`, `XpBreakdown` re-exports | REMOVE | RPG types |
| `types.ts` | `EventType`: `level_up`, `attribute_level_up`, `achievement_unlocked`, `vitality_loss`, `vitality_gain` | REMOVE | RPG events |
| `types.ts` | `quest_completed` event, `refType: 'quest'` | RENAME → `task_completed` / `'task'` | terminology map |
| `types.ts` | `Profile.level/totalXp/health/maxHealth` | REMOVE (keep name/avatar/streaks/timestamps) | §4.4 |
| `types.ts` | `AttributeStatRow`, `XpLedgerRow`, `HealthLog`, `AchievementRow` | REMOVE | RPG tables |
| `types.ts` | `Goal.attribute` | REMOVE | attribute link |
| `types.ts` | `QuestType/QuestStatus/Quest` (+columns) | RENAME → `TaskStatus/Task`, drop RPG columns | terminology map |
| `types.ts` | `Habit.difficulty/impact/attributes` | REMOVE (keep category) | ratings/links gone |
| `types.ts` | `TimelineEvent.xpDelta/healthDelta` | REMOVE | delta chips gone |
| `errors.ts` | `RECOVERY_LIMIT_REACHED` | REMOVE | recovery gone |

## Domain (`src/core/domain/`)
| location | what | decision | reason |
|---|---|---|---|
| `xp.ts` | whole file (formula, bases, consistency mult) | REMOVE | §4.1 |
| `levels.ts` | whole file | REMOVE | §4.1 |
| `attributes.ts` | whole file (category map, resolve, split) | REMOVE | §4.1 |
| `caps.ts` | whole file (soft cap, trivial rule) | REMOVE | §4.1 |
| `health.ts` | whole file (vitality math) | REMOVE | §4.1 |
| `achievements.ts` | whole file (defs, evaluate) | REMOVE | §4.1 |
| `streak.ts` | whole file | KEEP | locked: streaks stay |
| `time.ts` | whole file | KEEP | neutral date helpers |

## Platform / repo / services / settings
| location | what | decision | reason |
|---|---|---|---|
| `platform/dailyCheck.ts` | vitality catch-up body | REWRITE → streak-refresh only, keep triggers/locks/midnight schedule | §7 date-change refresh |
| `platform/events.ts` | pub/sub | KEEP | neutral |
| `repo/profile.ts` | `level/totalXp/health/maxHealth`, `health.*` settings writes | REMOVE | §4.4 |
| `services/completion.ts` | XP/ledger/levels/attributes/achievements/vitality logic | REWRITE → neutral completes per §7, still transactional | §7 contract |
| `services/completion.ts` | `CompletionResult` RPG fields | REWRITE → habit/task/milestone result shapes | §7 |
| `services/vitality.ts` | `runDailyCheck` | REMOVE | vitality gone |
| `services/backup.ts` | `BACKUP_TABLES` RPG entries, `formulaVersion`, `schemaVersion: 1` | REWRITE → new set, v2, legacy-v1 import migration | §8.3 |
| `services/backup.ts` | `LEDGER_GUARD` usage in import | REMOVE | ledger gone |
| `services/integrity.ts` | ledger/attribute/achievement checks | REWRITE → goal/milestone/task link checks | keep integrity w/o RPG |
| `settings/schema.ts` | `focusMode`, `health.*`, `xp.*`, old HIDDEN_IDS | REMOVE / new ids `active-tasks…` | §4.4, §6 |
| `settings/repo.ts` | get/set/validate logic | KEEP | logic neutral |

## Data layer (`src/data/`)
| location | what | decision | reason |
|---|---|---|---|
| `index.ts` | `completeQuest`, `runDailyCheck`, `getPlayerStatus`, quest CRUD names | RENAME/REMOVE per §7 | contract |
| `player.ts` | `getPlayerStatus` | REMOVE | character gone |
| `source.ts` | `DATA_SOURCE` (unused, dead) | REMOVE | dead code |
| `status.ts` | `getDbStatus` (verify usage; likely unused) | REMOVE if unused | dead code |
| `views.ts` | `questBaseXp/habitBaseXp`, attribute/difficulty mapping, reward fields, `getXpTotals`, XP analytics, XP/HP activity chips | REWRITE → neutral views + `getDashboardSummary` | §6/§7 |
| `views.ts` | `listQuestItems` | RENAME → `listTaskItems` | terminology map |
| `write.ts` | `createQuest/updateQuest/archiveQuest/deleteQuest`, difficulty/impact/attribute inputs | RENAME → task fns, neutral fields | §6 tasks form |
| `write.ts` | `createHabit/updateHabit` difficulty/impact/attributes | REMOVE (keep name/frequency/category/goal) | §6 habits |
## Features (`src/features/player/`)
| location | what | decision | reason |
|---|---|---|---|
| `types.ts` | `PlayerStatus`, `AttributeStat`, `HealthLogEntry`, helpers | REMOVE (keep `PlayerProfile`, rename) | character gone |
| `usePlayerStatus.ts` | whole hook | REMOVE | character gone |
| `usePlayerProfile.ts` | hook + DEFAULT name `'Player'` | RENAME to `features/profile/useUserProfile` | "Player" label gone |
## Pages / components
| location | what | decision | reason |
|---|---|---|---|
| `App.tsx` pageTitles | quests/attributes titles, settings subtitle "your rules" | REWRITE to tasks/github, "Configure the app" | §3, §5 |
| `Sidebar/nav-items.ts` | `quests`/`attributes` ids, labels, icons | RENAME to `tasks`, `github` (+ GitHubIcon) | §3 sidebar |
| `Sidebar/Sidebar.tsx` | `usePlayerProfile` import | RENAME import | follows hook rename |
| `Dashboard/PlayerStatusCard/` | whole HUD card | REMOVE, new `SummaryStrip` (avatar/name, streak chip, habits today + thin bar, due/overdue) | §6 |
| `Dashboard/AttributesPanel/` | whole panel | REMOVE | attributes gone |
| `Dashboard/QuestSection.tsx` | whole section | RENAME to `TaskSection.tsx` (deadline order, Mark as done) | §6 |
| `Dashboard/HabitsSection.tsx` | attribute/difficulty filters, reward chips, attribute tags | REWRITE to category tag (neutral), streak + dots | §6 |
| `Dashboard/GoalsAndTimeline.tsx` | `xpTotals` line, tone filter XP/HP, reward chips | REWRITE to neutral filters, no chips | §6 |
| `Dashboard/UpcomingDeadlines.tsx` | "No quests carry a deadline" | copy to "No tasks…" | terminology map |
| `Dashboard/Dashboard.tsx` | HUD wiring, `getXpTotals`, recovery claim, XP toasts, "Active quests" | REWRITE per §6 | replacement design |
| `Dashboard/dashboard-data.ts` | `QuestItem`, reward fields, difficulty, sample datasets | REWRITE (verify sample usage first) | RPG model + samples |
| `Dashboard/DashboardWidgets.tsx` | time/weather/focus timer | KEEP (verify no RPG copy) | neutral widgets |
| `FeaturePage/FeaturePage.tsx` | `AttributesPage`, `QuestManagementPage` | RENAME to `GitHubPage`, `TasksPage` | §3, §5 |
| `FeaturePage/HabitsPage.tsx` | embedded GitHub grid, difficulty/reward form, reward chips/sort | REWRITE per §6 | habits page |
| `FeaturePage/QuestManagementPage.tsx` | whole page | RENAME to `TasksPage.tsx` per §6 | tasks page |
| `FeaturePage/GoalsPage.tsx` | DemoNotice XP copy | copy fix (keep EventManager calendar) | §6 |
| `FeaturePage/AttributesPage.tsx` | whole page | REMOVE, new `GitHubPage.tsx` (existing grid + states) | §3 |
| `FeaturePage/TimelinePage.tsx` | XP/HP filters, reward sort/chips, `parseRewardValue` | REWRITE to type filters + newest/oldest; sanitize persisted prefs | §6 |
| `FeaturePage/AnalyticsPage.tsx` | `usePlayerStatus`, `topAttribute`, `xpTotal`, activity=X | REWRITE (keep 3 charts + focus panel) | §6 |
| `FeaturePage/SettingsPage.tsx` | `health` tab + rules + sync effect, "XP formula" about row | REMOVE; sanitize persisted `settings:section` | §6 |
| `FeaturePage/settings/DisplaySettings.tsx` | Focus mode row + reset-dialog copy | REMOVE / copy fix | §3 borderline |
| `FeaturePage/settings/DisplayPreview.tsx` | vitality meter + XP chip previews | REWRITE to neutral previews | §6 |
| `FirstRun/FirstRun.tsx` | "Set up your character" | copy to profile | §5 |
| `GlobalSearch/GlobalSearch.tsx` | Attributes group + `usePlayerStatus`, quest/reward details | REWRITE to tasks/habits/goals/activity | §5 |
| `icons/Icons.tsx` | `QuestsIcon` (blades), `AttributesIcon` reuse | RENAME to `TasksIcon`, `SettingsIcon`; ADD `GitHubIcon` | §4.5 |
| `ProgressBar/ProgressBar.tsx` | `tone: health/xp` | REMOVE prop, single neutral fill | §4.5 |
| `Avatar/Avatar.tsx` | "character portrait" comment | copy fix | §5 |
| `activity-data.ts`, `github-activity-grid.tsx`, `event-manager.tsx`, `PageHeader`, `ThemeToggle`, `SettingsControls`, `ui/*`, `UpdatePrompt` | — | KEEP (verify) | neutral |
| `preferences/schema.ts` | section ids, `ALWAYS_VISIBLE`, `focusMode` + key | REWRITE (`summary` locked/`today` locked, `active-tasks`…) | §6 |
| `preferences/sections.ts` | registry labels | REWRITE | §6 |
| `preferences/apply.ts` | `dataset.focusMode` | REMOVE | focus mode gone |
| `index.html` bootstrap | `pref:focusMode` lines | REMOVE (user-WIP file — leave uncommitted, report) | focus mode gone |

## Tests
| location | what | decision | reason |
|---|---|---|---|
| `tests/domain/xp|attributes|caps|levels.test.ts` | whole files | REMOVE | RPG domain gone |
| `tests/domain/health_time.test.ts` | vitality part | REMOVE; time part moves to `tests/domain/time.test.ts` | split keep/drop |
| `tests/domain/streak.test.ts` | — | KEEP | streaks stay |
| `tests/services/vitality.test.ts` | whole file | REMOVE | vitality gone |
| `tests/services/completion.test.ts` | XP/ledger/recovery assertions | REWRITE per §11 behavior tests | Phase 1 |
| `tests/services/backup.test.ts` | ledger/xp assertions | REWRITE + legacy-v1 import test | §8.3, §11 |
| `tests/db/db.test.ts` | ledger/health/achievement/settings-health assertions | REWRITE (uniqueness, tx rollback, settings reject unknown) | §11 |
| NEW `tests/db/migration.test.ts` | old-schema fixture, migrate, §11 assertions + twice-no-op | ADD (fails first = RED) | Phase 1 |
| NEW `tests/services/productivity.test.ts` | summary/analytics/timeline on hand-checked data + negative checks | ADD | §11 |
| NEW prefs legacy-load test | `coercePreferences` with legacy ids/keys | ADD | §8.4, §11 |

## Docs / config / assets
| location | what | decision | reason |
|---|---|---|---|
| `README.md` | RPG description/status/features/roadmap/screenshot | REWRITE (public product + stack only) | §4.6 |
| `docs/QA.md` | XP/ledger/vitality/character/health checklist | REWRITE for new product | §4.6 |
| `docs/DATA.md` | — | TOUCH: backup `schemaVersion: 2` + legacy import note | §8.3 |
| `docs/DEPLOY.md` | — | KEEP (verify; migration note stays valid) | neutral |
| `vite.config.ts` manifest description | "RPG-style progression" | EDIT 1 line (user-WIP file — leave uncommitted, report) | §4.6 |
| `package.json` / `Cargo.toml` | — | KEEP (no RPG text; no game-only deps) | verified |
| `src-tauri/` (untracked user scaffold) | productName/window title | LEAVE for user; report: set `LifeOS`, keep `identifier` | §2.3 |
| `public/*.svg` favicon/logo (amber bolt) | logo | KEEP (brand mark, not game iconography) | decision |
| `tasks/phase0.md`, `design/image.png` (gitignored) | history/reference | KEEP (untouched) | not product docs |
| `index.html` title "LifeOS Dashboard" | — | KEEP | already neutral |

## False positives (KEEP with reason)
- `fitness`/`health` as user categories — ordinary category vocabulary.
- `focus` in `:focus-visible`, focus ring, `FocusSessionCard`/`FOCUS_MODES` (pomodoro timer) — unrelated to game Focus attribute.
- `gold/rose/sky/emerald/ember` goal/summary tones — color names, not gold economy.
- `streak` everywhere — locked as kept.
- `consistency %` — locked as kept (statistic).
- `stat` in "stats" wording if any remains — ordinary statistics (verify per hit).
- `level` in heading/log/nesting contexts only (verify per hit; game levels all removed).
- `Disabled`/`display` containing "is"/"play" substrings — substring noise, not words.
- `lifeos:cover:*`, page covers, profile picture — Notion-style chrome, not RPG.
- `weekStart`, week maths — calendar, not seasons.
- `achievements-*.js` chunk in old `dist/` — build artifact, regenerates clean.

| `features/player/` dir | dirname | RENAME to `features/profile/` | terminology map |


