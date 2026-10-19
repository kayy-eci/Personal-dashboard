# LifeOS — Product Requirements Document

Version 1.1 (Draft) | Owner: Product | Date: October 19, 2026 | Status: Ready for build planning

> Revision 1.1: closes P0, adds the Status property type, relative date
> filters, linked database views, chart views and default property values;
> promotes board, calendar, relation, rollup and formula to P1; adds F7.10
> (daily habit check-in automation) and F10 (Life OS starter pack); the
> release plan follows the revised roadmap; open question 6 is decided.

## 1. Executive Summary

LifeOS is a personal, local-first desktop workspace for notes, documents and structured data, modeled on the Notion experience: everything is a page, pages are made of blocks, pages nest inside pages, and pages can become databases. It is built for one demanding user, its creator, who intends to run daily life from it.

The product bet: a fast, offline, private workspace that the owner fully controls beats a general-purpose cloud tool for daily use, provided the editor feels excellent and data is never lost. v1 therefore concentrates on what decides whether the owner keeps opening it every day: a great block editor, fast page navigation, bulletproof local storage, a native desktop experience, and instant search. Databases, templates, import/export and sync follow in staged releases, and databases arrive early enough that a Life OS starter pack (F10) proves the thesis: no habit, task or goal module is built as dedicated code — everything is database rows plus a blueprint.

Key decisions in this document:

- Platform: desktop app (Electron shell + Next.js/TypeScript UI) with local SQLite storage.
- Editor: Tiptap (ProseMirror) with JSON document storage; no custom editor engine.
- Scope: single user, offline-first in v1. Sync and sharing are post-v1, but the v1 data model is built to support them.
- Delivery: one developer working roughly 1-2 hours per day, so every feature is sliced into P0/P1/P2 and v1 is deliberately narrow.

## 2. Vision, Target User and Principles

**Vision.** One calm, fast place to think, plan and keep track of life.

**Primary user.** The owner-developer: takes notes, plans projects, keeps a journal and task lists, tracks side projects. Comfortable with keyboards and markdown. Works at a desktop most of the day, sometimes offline. Frustrated by slow web apps and lock-in.

**Jobs to be done.**

- When I have a thought, let me capture it in seconds without deciding where it belongs.
- When I plan something, let me structure it with headings, lists, to-dos and tables.
- When I come back later, let me find it instantly.
- When something goes wrong, let me be certain my notes are safe and recoverable.

**Principles.**

1. Writing feels instant: no spinner between keystroke and screen.
2. Never lose data: every edit is durable and every destructive action is reversible.
3. Keyboard first: everything is reachable without a mouse.
4. Local first: works offline, owns its data, can export everything.
5. Boring where possible: proven libraries (Tiptap, SQLite, Electron); spend effort on product details.
6. Ship narrow, widen later.

## 3. Platform and Architecture Decisions

- **Desktop shell: Electron.** Chosen over Tauri because the Next.js UI and SQLite access share one TypeScript/Node toolchain with no Rust to learn. Trade-off: larger install size and memory use. Revisit if footprint becomes a problem.
- **UI: Next.js + TypeScript, static export.** The UI is built with `output: 'export'` and loaded inside the Electron window. With no Next.js server at runtime, API routes are not used; the UI talks to the main process through typed IPC.
- **Storage: SQLite (better-sqlite3), WAL mode.** One file, transactional, fast, portable. Use Drizzle ORM or plain SQL; Prisma's native engine tends to be awkward to package inside Electron.
- **Editor: Tiptap (ProseMirror).** Content is stored as JSON in the page row, with a schema version on every document.
- **Search: SQLite FTS5** over extracted plain text.
- **IDs and timestamps:** UUIDv7 or ULID primary keys, created_at/updated_at on every row, soft deletes. Near-zero cost now; makes later sync feasible.
- **Packaging and updates:** electron-builder and electron-updater. Code signing is needed for smooth auto-update on Windows and macOS.
- **Security:** contextIsolation on, nodeIntegration off, strict CSP, no remote content, IPC inputs validated.

## 4. Core Feature Map

1. F1 Rich Text Block Editor — P0 — Phase 1
2. F2 Page Hierarchy and Sidebar Navigation — P0 — Phase 1
3. F3 Local-First Storage, Autosave and Data Safety — P0 — Phase 1
4. F4 Desktop Shell and Native Integration — P0/P1 — Phases 1-2
5. F5 Search and Command Palette — P1 — Phase 2
6. F6 Databases and Views — P1 (files property P2) — Phase 3
7. F7 Templates and Daily Notes — P1 — Phase 2
8. F8 Import, Export and Backup — P1 — Phase 2
9. F9 Sync, Accounts and Sharing — P2 — Post-v1
10. F10 Life OS Starter Pack — P1 — Phase 3

Priority definitions: P0 = required for LifeOS to be usable daily. P1 = required for v1 to feel complete. P2 = after v1.

Each feature PRD below uses the same structure: problem, goals and non-goals, user stories, functional requirements (numbered FR-x.y with priority), non-functional requirements, UX notes, success metrics, dependencies and risks, acceptance criteria.

## 5. F1 — Rich Text Block Editor

**Priority:** P0 | **Phase:** 1

**Problem.** Daily use lives or dies on the editor. If typing lags, formatting is fiddly or pasted content gets mangled, the owner returns to another tool. Building a rich text engine from scratch is a multi-month risk, so LifeOS relies on Tiptap and invests in the interaction details that make Notion-style editing feel good.

**Goals.**

- Every paragraph, heading, list item and to-do is a block that can be created, converted, moved and nested.
- Any block type is reachable within two keystrokes from anywhere on the page.
- Content round-trips losslessly between the editor, storage and export.

**Non-goals (v1).** Real-time collaboration, comments, synced blocks, columns, web embeds, AI writing features.

**User stories.**

- As a writer, I want to type / and pick a block type so I never leave the keyboard.
- As a markdown user, I want typing #, -, [] or three backticks to convert the line automatically so formatting costs no extra effort.
- As a planner, I want to move blocks by drag or shortcut so I can restructure a page quickly.
- As a researcher, I want pasted text, HTML and images to become clean blocks.
- As a user, I want undo and redo to behave predictably so I can experiment without fear.

**Functional requirements.**

- FR-1.1 (P0) Block model: every top-level node has a stable unique ID and is individually addressable (needed for linking, drag and drop, and future sync).
- FR-1.2 (P0) Block types v1: paragraph, heading 1-3, bulleted list, numbered list, to-do (checked state), toggle, quote, callout (with icon), code block (language selector, syntax highlighting), divider, image, simple table.
- FR-1.3 (P0) Inline formatting: bold, italic, underline, strikethrough, inline code, highlight, text color, hyperlink, with standard shortcuts (Ctrl/Cmd+B, I, U, K, E).
- FR-1.4 (P0) Slash menu: opens on / at line start or after a space; fuzzy filter by name and alias; arrow keys and Enter to select; Esc closes; each item shows an icon and a one-line description.
- FR-1.5 (P0) Markdown shortcuts: block-level (#, ##, ###, -, *, 1., [], >, three backticks, ---) and inline (**, *, ~~, backtick) convert as you type, and undo with one Ctrl/Cmd+Z.
- FR-1.6 (P0) Floating toolbar on text selection with formatting, link, turn-into and color controls.
- FR-1.7 (P0) Reordering: drag handle in the left gutter on hover (also opens a menu with delete, duplicate, turn into, color); keyboard move with Ctrl/Cmd+Shift+Up/Down.
- FR-1.8 (P0) Nesting: Tab and Shift+Tab indent and outdent list items, to-dos and toggles; Enter on an empty item exits the list.
- FR-1.9 (P0) Paste handling: rich HTML and markdown paste become blocks; Ctrl/Cmd+Shift+V pastes plain text; pasted or dropped images are saved as local attachment files, never as base64 inside the document.
- FR-1.10 (P0) Undo and redo cover typing, formatting, block moves and conversions within a session.
- FR-1.11 (P1) Page links and mentions: typing [[ or @ searches pages and inserts a link that stays correct when the target page is renamed (depends on F2 and F5).
- FR-1.12 (P1) Multi-block selection with bulk delete, duplicate, move, color and turn-into.
- FR-1.13 (P1) Copy link to block (`lifeos://page/{id}#block-{id}`; depends on F4).
- FR-1.14 (P2) Columns, LaTeX equations, bookmarks and web embeds, synced blocks, drawing.

**Non-functional requirements.**

- Performance: keystroke-to-render under 50 ms at p95 on a 5,000-block page; a typical page opens in under 150 ms.
- Reliability: the document schema is versioned (schema_version); every schema change ships with a migration tested against stored documents.
- Accessibility: all editor actions are keyboard reachable; sensible ARIA roles; reduced-motion respected; WCAG AA contrast in both themes.
- Input: full IME support and international keyboard layouts; spellcheck through the OS.

**UX notes.** Minimal chrome, no permanent toolbar. Content column about 720 px wide with a full-width toggle. Drag handle and plus button appear on hover in the left gutter. An empty page shows a hint line: Type / for commands.

**Success metrics.**

- 100% of the owner's daily notes are created in LifeOS after 4 weeks of dogfooding.
- p95 input latency under 50 ms on the benchmark page.
- Zero content-corruption bugs across a test corpus of 50 representative pastes and conversions.
- Fewer than one editor-caused workaround per week in the dogfood log.

**Dependencies and risks.**

- Depends on F3 for persistence, and on F2 and F5 for page links.
- Risk: custom nodes (toggle, callout) are harder in ProseMirror than they look. Mitigation: time-box, and prefer official or community Tiptap extensions first.
- Risk: schema churn breaks stored documents. Mitigation: versioned schema and migration tests from day one.
- Risk: drag and drop edge cases with nested blocks. Mitigation: ship keyboard moves first, drag handle second.

**Acceptance criteria.**

- Given an empty page, when I type /h1 and press Enter, then a Heading 1 block is created and focused.
- Given a line starting with [], when I type a space, then it becomes a to-do that can be checked.
- Given a nested list, when I press Shift+Tab on an item, then it outdents one level and order is preserved.
- Given an image on the clipboard, when I paste, then it appears as an image block and the file exists in the attachments folder.
- Given any sequence of edits, when I press Ctrl/Cmd+Z repeatedly, then the page returns step by step to its original state.

## 6. F2 — Page Hierarchy and Sidebar Navigation

**Priority:** P0 | **Phase:** 1

**Problem.** Notes only become a system when they can be organized. Without a fast, forgiving page hierarchy, content piles up in a flat list and becomes unfindable.

**Goals.**

- Unlimited page nesting, like Notion's sidebar tree.
- Reach any frequently used page in one click or keystroke.
- Reorganize freely without risk of losing or orphaning content.

**Non-goals (v1).** Multiple workspaces, teamspaces and permissions (see F9).

**User stories.**

- As a user, I want a sidebar tree of pages so I can see my structure at a glance.
- As a user, I want to drag pages into other pages so I can reorganize without copy and paste.
- As a user, I want to favorite pages so my most-used ones are always one click away.
- As a user, I want deletions to go to a trash so mistakes are recoverable.
- As a user, I want back and forward navigation so I can retrace my steps.

**Functional requirements.**

- FR-2.1 (P0) Page entity: title, icon (emoji), optional cover, parent_id, position, is_favorite, created_at, updated_at, deleted_at. Root pages have a null parent.
- FR-2.2 (P0) Sidebar tree: nested, expandable and collapsible, expansion state persisted, active page highlighted, resizable (200-480 px) and collapsible with Ctrl/Cmd+Shift+B.
- FR-2.3 (P0) Create page: sidebar + button, Ctrl/Cmd+N, sub-page from the slash menu or the + on a tree node; a new page opens with the cursor in the title.
- FR-2.4 (P0) Rename inline from the page title or the sidebar; changes reflect everywhere instantly.
- FR-2.5 (P0) Move and reorder by drag and drop with drop indicators (before, after, inside). Ordering uses fractional indexing so a move updates one row. Moving a page into its own descendant is rejected.
- FR-2.6 (P0) Delete moves the page and its whole subtree to Trash. The Trash view lists deleted pages; restore returns the subtree to its original place (or to root if the parent is gone); permanent delete needs confirmation; auto-purge after 30 days, configurable.
- FR-2.7 (P0) Breadcrumbs on every page; each crumb is clickable; long paths truncate in the middle.
- FR-2.8 (P1) Favorites section at the top of the sidebar, reorderable.
- FR-2.9 (P1) Back and forward history (Alt+Left/Right, mouse buttons) and a Recents list.
- FR-2.10 (P1) Duplicate page (with or without sub-pages) and copy page link.
- FR-2.11 (P1) Backlinks panel listing pages that link to the current one (depends on FR-1.11).
- FR-2.12 (P1) Page options: full width, small text, lock page (read-only).
- FR-2.13 (P2) Tabs, split view and multiple windows.

**Non-functional requirements.**

- The sidebar handles 5,000 pages smoothly (virtualized, children loaded lazily).
- A move or reorder completes in under 100 ms.
- Tree state is consistent after a crash: no orphans, no cycles.

**UX notes.** Sidebar sections: Favorites, Pages, Trash. Hover reveals + and a more-actions menu. Drop targets are clearly highlighted. A first-run Getting Started page demonstrates the key shortcuts.

**Success metrics.**

- Median of 2 or fewer clicks or keystrokes to reach a frequently used page.
- Zero orphaned pages or cycles found by the integrity check.
- A new page is created and ready to type in under 1 second.

**Dependencies and risks.**

- Depends on F3 for storage; F5 enhances navigation.
- Risk: tree corruption (orphans, cycles). Mitigation: database constraints, validation in the move operation, startup integrity scan.
- Risk: fractional index precision runs out after many moves. Mitigation: rebalance siblings when positions get too close.

**Acceptance criteria.**

- Given a page with children, when I delete it, then all descendants disappear from the sidebar and appear in Trash; when I restore it, they return in their original order.
- Given page A, when I drag A onto its own child, then the drop is rejected with a visual cue.
- Given I quit and reopen the app, then the sidebar expansion state and the last opened page are restored.

## 7. F3 — Local-First Storage, Autosave and Data Safety

**Priority:** P0 | **Phase:** 1

**Problem.** Trust is the product. A notes app that ever loses or corrupts data gets abandoned. Going desktop and offline-first removes the server as a safety net, so the app itself must guarantee durability, recovery and safe upgrades.

**Goals.**

- Zero data loss under normal use, crashes and force quits.
- Instant save with a visible save state.
- Recoverable history for every page.
- A data model that does not block future sync.

**Non-goals (v1).** Cloud storage, multi-device sync, end-to-end encryption (see F9).

**User stories.**

- As a user, I want edits saved automatically so I never think about saving.
- As a user, I want to see that my work is saved so I can trust it.
- As a user, I want to restore an earlier version of a page after a mistake.
- As a user, I want app updates to never break or lose my data.

**Functional requirements.**

- FR-3.1 (P0) One SQLite database in the OS user-data directory; WAL mode; foreign keys on; every write in a transaction.
- FR-3.2 (P0) Autosave: debounce 500 ms after the last keystroke, a hard flush every 5 seconds of continuous typing, and an immediate flush on blur, page change, window close and quit.
- FR-3.3 (P0) Save-state indicator: Saving, Saved, or Error with retry. Failures never pass silently and unsaved content stays in memory.
- FR-3.4 (P0) Schema migrations: ordered, versioned, idempotent; an automatic copy of the database file is made before any migration; a failed migration rolls back and offers recovery options.
- FR-3.5 (P0) Sync-ready data model: UUIDv7 or ULID keys, UTC created_at/updated_at, soft-delete tombstones, a device_id, and an append-only change log for every write.
- FR-3.6 (P0) Attachments stored on disk in a content-addressed folder (SHA-256 file names) and referenced by hash; a weekly job removes orphans only after confirming they have no references.
- FR-3.7 (P1) Page version history: automatic snapshot at most every 5 minutes of active editing and on close; keep 30 days; browse and restore, where a restore itself creates a new version.
- FR-3.8 (P1) Startup integrity check (quick_check plus orphan and cycle scan) with a repair report.
- FR-3.9 (P1) Crash recovery: after an unexpected exit, the next launch verifies the last writes and reopens the previous session.
- FR-3.10 (P1) Configurable data location, with a warning about using a cloud-synced folder from two machines at once.
- FR-3.11 (P2) Encryption at rest (SQLCipher) with a passphrase and an app lock.

**Non-functional requirements.**

- Cold start to an editable page in under 2 seconds with 5,000 pages.
- Autosave write latency under 20 ms; all disk work runs off the UI thread.
- History storage is capped and compacted so the database does not grow without bound.

**UX notes.** A small, quiet status indicator near the page title; no modal dialogs for normal saves; clear, calm language in error states with a visible recovery path.

**Success metrics.**

- Zero data-loss incidents.
- At least 99.9% of autosaves succeed.
- 100% recovery across 50 forced-kill tests.
- Migration success across a test matrix of all prior versions.

**Dependencies and risks.**

- Risk: the native module (better-sqlite3) must be rebuilt per OS and Electron version. Mitigation: pin versions, build and test in CI on each OS.
- Risk: corruption from antivirus or cloud-sync tools touching the file. Mitigation: WAL mode, startup integrity check, automatic backups (F8).
- Risk: change-log growth. Mitigation: a compaction policy once sync is introduced.

**Acceptance criteria.**

- Given I am typing, when the process is killed, then at most the last 500 ms of typing is lost on relaunch.
- Given a new app version with a schema change, when I launch it, then a backup is created first and my data appears intact.
- Given a page edited over several days, when I open version history, then I see timestamped versions and can restore one without losing the current state.

## 8. F4 — Desktop Shell and Native Integration

**Priority:** P0 for the shell, P1 for capture and updates | **Phases:** 1-2

**Problem.** A desktop app has to feel native and disappear into the workflow. The difference between a web page in a window and a real desktop tool is quick capture, shortcuts, window behavior and reliable updates.

**Goals.**

- A native-feeling, secure shell.
- Capture a thought from anywhere in under 3 seconds.
- Painless installation and updates.

**Non-goals (v1).** Mobile apps, a browser web clipper, OS widgets.

**User stories.**

- As a user, I want the app to reopen with the same window size, position and last page so I continue where I left off.
- As a user, I want a global shortcut that opens a small capture box so I can jot something down without switching context.
- As a user, I want light and dark themes that follow my system.
- As a user, I want updates installed automatically and safely.

**Functional requirements.**

- FR-4.1 (P0) Architecture: the main process owns the database, file system and OS APIs; the renderer runs the Next.js static export; a preload script exposes a minimal typed IPC API. contextIsolation on, nodeIntegration off, sandbox on, strict CSP, all IPC inputs validated.
- FR-4.2 (P0) Window management: persisted size, position, maximized state and sidebar width; single-instance lock (a second launch focuses the existing window); sensible minimum window size.
- FR-4.3 (P0) Native menus and standard shortcuts per OS (Cmd vs Ctrl), plus a shortcut cheat sheet on Ctrl/Cmd+/.
- FR-4.4 (P0) Theme: light, dark or system; applied without a flash on launch.
- FR-4.5 (P0) Installers built in CI: Windows (NSIS), macOS (dmg), Linux (AppImage or deb). The owner's daily OS ships first; the others follow once CI is in place.
- FR-4.6 (P1) Quick capture: a global shortcut opens a small always-on-top window; on Enter the text is appended as a new block to an Inbox page (created if missing) and the window closes; Esc cancels.
- FR-4.7 (P1) System tray or menu bar icon with New page, Quick capture and Quit; optional close-to-tray and launch at login.
- FR-4.8 (P1) Auto-update: check on launch and every 6 hours, download in the background, prompt to restart; stable and beta channels; signed builds; the pre-migration backup in FR-3.4 always runs first.
- FR-4.9 (P1) Deep links: `lifeos://page/{id}` opens that page in the running app.
- FR-4.10 (P1) Settings window: appearance, editor defaults, data location, backups, shortcuts, about and version.
- FR-4.11 (P2) Custom title bar, native notifications for reminders, drag files onto the window to import, spellcheck language selection, localized UI.

**Non-functional requirements.**

- Install size under 200 MB; idle memory under 400 MB with a typical workspace open; cold start under 2 seconds.
- No network access required for any v1 feature.
- No analytics or telemetry; a local diagnostics log only.

**UX notes.** The app looks and behaves like a native tool on each OS (menus, shortcuts, window chrome). The quick capture window is a single text field with no chrome beyond a subtle border. Settings are minimal and searchable.

**Success metrics.**

- App opens in under 2 seconds in 95% of launches.
- Crash-free sessions of at least 99.5%.
- Quick capture from shortcut to saved in under 3 seconds.
- Update success rate of at least 95%.

**Dependencies and risks.**

- Depends on F3 for the data layer and migration backup.
- Risk: code-signing certificates cost money and setup time. Mitigation: unsigned builds are fine for personal use at first; set up signing before relying on auto-update.
- Risk: Electron security misconfiguration. Mitigation: follow the Electron security checklist and review it before each release.
- Risk: global shortcut conflicts with other apps. Mitigation: make the shortcut configurable.

**Acceptance criteria.**

- Given the app is in the background, when I press the capture shortcut, type text and press Enter, then the text appears at the end of Inbox and the window closes in under 3 seconds.
- Given the app is running, when I launch a second instance, then the existing window is focused and no second window opens.
- Given a new version is published, when the app checks for updates, then it downloads in the background and asks me to restart; after restarting my data is intact.

## 9. F5 — Search and Command Palette

**Priority:** P1 | **Phase:** 2

**Problem.** As the workspace grows, the sidebar stops being enough. Finding a note by remembering where it lives is slower than finding it by remembering a word in it.

**Goals.**

- Open any page by name in under a second.
- Find any text across all pages.
- Run any app action from the keyboard.

**Non-goals (v1).** Semantic or AI search, OCR inside images or PDFs, saved searches.

**User stories.**

- As a user, I want to press Ctrl/Cmd+K and type a few letters to jump to a page.
- As a user, I want to search the content of every page and see matching snippets.
- As a user, I want to run actions such as new page, toggle theme or open today's note without touching the mouse.
- As a user, I want recent pages ranked first so my current work is the quickest to reach.

**Functional requirements.**

- FR-5.1 (P1) Quick switcher (Ctrl/Cmd+K): fuzzy title match; recent pages shown when the query is empty; each result shows icon and breadcrumb path to tell duplicate titles apart; Enter opens.
- FR-5.2 (P1) Full-text index: an SQLite FTS5 table over page title and plain text extracted from the block JSON, updated in the same transaction as the page save, with diacritic folding.
- FR-5.3 (P1) Search view (Ctrl/Cmd+Shift+F): results grouped by page with highlighted snippets, ranked by relevance with a recency boost; clicking a result opens the page and scrolls to the match.
- FR-5.4 (P1) Filters: location (within a page subtree), last-edited date range, include or exclude Trash, pages versus database rows.
- FR-5.5 (P1) Command palette (Ctrl/Cmd+Shift+P): searchable list of commands (new page, new database, open today's note, toggle theme, toggle sidebar, export page, open settings, reindex). Commands register through one registry so each new feature adds commands cheaply.
- FR-5.6 (P1) In-page find (Ctrl/Cmd+F) with next, previous and match count.
- FR-5.7 (P1) Reindex command, plus automatic reindex when the index version changes.
- FR-5.8 (P2) Search database property values, phrase and boolean operators, saved searches, search inside attachments.

**Non-functional requirements.**

- Results in under 100 ms for 10,000 pages (median target 50 ms).
- The index adds no more than 30% to database size.
- Incremental index update under 10 ms per save.

**UX notes.** A centered overlay, fully keyboard driven, results update on each keystroke (50 ms debounce). The empty state shows recent pages. Esc closes and returns focus to the previous cursor position.

**Success metrics.**

- At least 60% of page navigations after week 4 go through the switcher.
- Median time to open a known page under 2 seconds.
- Zero stale results: the index always matches saved content in test runs.

**Dependencies and risks.**

- Depends on F2 (page titles and paths) and F3 (transactional saves).
- Risk: index drift from content. Mitigation: same-transaction updates and a reindex command.
- Risk: tokenizer quality for non-English or mixed-language notes. Mitigation: test with the owner's real notes; consider a trigram index for substring matching.

**Acceptance criteria.**

- Given a page titled Weekly Review, when I press Ctrl/Cmd+K and type wkly, then it appears in the top three results.
- Given I edit and save a page, when I search for a new word from that edit, then the page appears in the results immediately.
- Given the palette is open, when I type theme, then Toggle theme appears and runs on Enter.

## 10. F6 — Databases and Views

**Priority:** P1 for tables, board, calendar, relation, rollup and formula; P2 for the files property and reminders | **Phase:** 3

**Problem.** Pages hold narrative, but life also needs structured data: tasks, projects, reading lists, habits, finances. Without databases, structured information is forced into plain lists and tables that cannot be filtered, sorted or reused.

**Goals.**

- A database is a collection of pages (rows) with typed properties.
- The same data can be seen as a table, board or calendar.
- Every row is a full page that uses the same editor as any other page.
- The whole life system (tasks, habits, goals) is built from these generic features, not from dedicated modules (F10).

**Non-goals (v1).** Synced databases, app-wide automations beyond FR-7.10, the files and media property (P2), database reminders (P2).

**User stories.**

- As a planner, I want a table of tasks with status, due date and priority so I can see everything at once.
- As a user, I want to filter and sort by any property so I only see what matters now.
- As a user, I want a board grouped by status so I can drag tasks across columns.
- As a user, I want to open a row as a full page to write notes about it.
- As a user, I want to import and export tables as CSV.
- As a daily user, I want a chart of habit completions per day so a week at a glance tells me the truth.
- As a planner, I want rollups so a goal reflects the percent of its milestones that are Done.

**Functional requirements.**

- FR-6.1 (P1) Data model: a database has typed properties and rows; each row is a page (reusing F1 and F2) with a map of property values; schema changes are non-destructive and versioned.
- FR-6.2 (P1) Create a full-page database or an inline database block from the slash menu.
- FR-6.3 (P1) Property types v1: title, text, number, select, multi-select, status (pipeline states such as Not started / In progress / Done), date (with optional range), checkbox, URL; created time and last-edited time as read-only system properties.
- FR-6.4 (P1) Table view: inline cell editing, column resize, reorder and hide, add row with Enter on the last row, keyboard navigation between cells, manual row reorder when no sort is active, bulk select and delete, row count footer.
- FR-6.5 (P1) Saved views: multiple views per database, each storing its own filters, sorts, grouping and visible properties.
- FR-6.6 (P1) Filter and sort: type-appropriate operators (contains, is, is not, before, after, is empty, greater than and so on); relative date operators that resolve at query time in the local time zone (is today, this week, next 7 days, past due); AND/OR groups one level deep; multi-level sort.
- FR-6.7 (P1) Row as page: opening a row shows a properties header above the full block editor.
- FR-6.8 (P1) Property management: rename, reorder, delete with confirmation, change type with a conversion preview and a warning for lossy conversions.
- FR-6.9 (P1) CSV import (map columns to types) and CSV export.
- FR-6.10 (P1) Board view (group by select or status, drag between columns), Calendar view (by date property), List and Gallery views.
- FR-6.11 (P1) Relation (two-way links between databases), rollup and formula properties. Rollups compute count, count checked, percent checked, percent of rows whose Status is Done, sum, min/max, earliest/latest date and current streak, with an optional filter such as "last 30 days". Formulas use a limited fixed function set (arithmetic, if, and/or, date difference, today, round, concat) evaluated by a small parser — never eval on arbitrary code. The files and media property stays P2.
- FR-6.12 (P2) Reminders on date properties (needs F4 notifications), recurring items, sub-items, templates per database. Recurring items stay P2 because habits (F10) cover repetition.
- FR-6.13 (P1) Linked database views: an embedded view of an existing database on any page, with its own filters, sorts and visible properties; used on the Home page (F10).
- FR-6.14 (P1) Chart view: bar, line, donut and number charts; group rows by a property; count or sum as the measure; the view's filters apply. Seeded by F10's Home page (habit completions per day for the last 7 days, tasks completed per week).
- FR-6.15 (P1) Default property values for new rows (for example Status defaults to Not started), configured per property.

**Non-functional requirements.**

- 5,000 rows scroll smoothly (virtualized rendering).
- Filter or sort recomputes in under 150 ms; a cell edit saves in under 50 ms.
- Property values are indexed so filters do not scan every row's JSON.

**UX notes.** The table behaves like a spreadsheet: Tab and Shift+Tab move across cells, Enter edits, Esc cancels, typing replaces the cell value. Property type icons in column headers, view tabs above the table, and a New row control that is always visible.

**Success metrics.**

- The owner moves task and project tracking into LifeOS within 2 weeks of release.
- All table operations stay inside the latency budgets above on a 5,000-row test database.
- Zero data loss on property type change across the test suite.
- 100% CSV round-trip fidelity for supported property types.

**Dependencies and risks.**

- Depends on F1, F2, F3; benefits from F5 (searching rows) and F7 (row templates).
- Risk: this is the largest scope risk in the product. Mitigation: ship the table view alone first and add one view type at a time.
- Risk: slow queries if properties live in opaque JSON. Mitigation: use an indexed property-values table and benchmark early.
- Risk: lossy type conversions. Mitigation: preview, confirmation and undo.

**Acceptance criteria.**

- Given a database with three properties, when I add the filter Status is Done and sort by Due date, then only matching rows appear in order and the view remembers this after a restart.
- Given a row, when I open it, then I see its properties above a full editor and edits save automatically.
- Given a CSV whose text column contains numbers, when I import and map it to Number, then values convert and invalid cells are reported rather than dropped.

## 11. F7 — Templates and Daily Notes

**Priority:** P1 | **Phase:** 2

**Problem.** A life workspace is used through repetition: the daily note, the weekly review, the meeting note. Rebuilding the same structure by hand each time is friction that kills the habit.

**Goals.**

- Start any recurring page in one action with its structure already in place.
- Make opening today's note effortless.

**Non-goals (v1).** A cloud template gallery, automatic page creation while the app is closed, AI-filled templates.

**User stories.**

- As a user, I want one shortcut that takes me to today's note, creating it from my template if needed.
- As a user, I want opening today's note to prepare my habit log automatically so checking off habits needs zero setup.
- As a user, I want to save any page as a template and reuse it.
- As a user, I want built-in templates so a fresh workspace is useful immediately.
- As a user, I want to see all my unchecked to-dos across pages in one place (P2).

**Functional requirements.**

- FR-7.1 (P1) Save as template: any page, optionally with its sub-pages, can be marked as a template; templates live in a Templates section, are excluded from search by default and show a template badge.
- FR-7.2 (P1) New from template via the New page menu and the slash menu; the template content is copied, not linked.
- FR-7.3 (P1) Template variables `{{date}}`, `{{time}}`, `{{weekday}}` and `{{title}}` are resolved at creation, with configurable date formats.
- FR-7.4 (P1) Daily note: a shortcut (Ctrl/Cmd+Alt+D) and a palette command open today's note under a Journal parent organized by Year, Month and Day (or flat, configurable); it is created from the Daily template if missing; previous-day and next-day navigation.
- FR-7.5 (P1) Built-in starter templates: Daily Note, Weekly Review, Meeting Notes, Project Brief, Reading List, and a Habit Tracker database.
- FR-7.6 (P1) Database row templates that pre-fill properties and body when adding a row, respecting each property's default values (FR-6.15) and adding template defaults on top (depends on F6).
- FR-7.7 (P2) Sidebar calendar showing days that have notes; jump to any date.
- FR-7.8 (P2) Tasks rollup: a My Tasks view aggregating every unchecked to-do block across pages, each linking back to its source; checking an item in the rollup checks it in the source page.
- FR-7.9 (P2) Recurring templates (for example a weekly review created every Sunday when the app opens) and carry-over of unfinished to-dos from the previous daily note.
- FR-7.10 (P1) Daily habit check-in automation: opening or creating today's daily note creates today's Habit Log rows for every active habit that lacks one. The operation is idempotent and scoped to today only: re-opening the daily note or re-running it never creates a second row for a habit-day pair, and a missing row counts as not done. Used by the F10 starter pack.

**Non-functional requirements.**

- Creating a page from a 500-block template takes under 300 ms.
- Variables only replace explicit placeholders and never touch other user text.

**UX notes.** The template picker is a small searchable menu with previews. The daily note opens with the cursor in the first empty block. Unfilled placeholders look visibly different from finished text.

**Success metrics.**

- A daily note exists on at least 6 of 7 days per week during dogfooding.
- Shortcut to typing in today's note in under 1 second.
- At least 3 owner-created templates in regular use after one month.

**Dependencies and risks.**

- Depends on F1, F2 and F5 (commands); F6 for database templates.
- Risk: Journal hierarchy sprawl. Mitigation: a flat option, or a database-backed journal.
- Risk: the tasks rollup needs a block-level index. Mitigation: extract to-do blocks into an indexed table on save, reusing the F5 indexing pipeline.

**Acceptance criteria.**

- Given no note exists for today, when I press the daily note shortcut, then a page dated today is created from the Daily template and opened with the cursor ready.
- Given a template containing `{{date}}`, when I create a page from it on a different day, then the page shows that day's date.
- Given the Tasks rollup, when I check an item, then the matching to-do in its source page is checked too.
- Given today's daily note, when I open it, then today's Habit Log rows exist for every active habit; opening it again creates no further rows (FR-7.10 is idempotent and scoped to today).

## 12. F8 — Import, Export and Backup

**Priority:** P1 | **Phase:** 2

**Problem.** Local-first only earns trust if data can get in, get out and be duplicated safely. Without import the owner cannot migrate existing notes; without export and backup, the data is only as safe as one disk.

**Goals.**

- Bring existing notes in with their structure intact.
- Take anything out in an open format, so there is never lock-in.
- Automatic backups that can be restored without technical knowledge.

**Non-goals (v1).** Live two-way sync with external folders, importers for every competitor, built-in cloud backup providers (a user-chosen folder is used instead).

**User stories.**

- As a user, I want to import my Markdown notes folder and keep its hierarchy.
- As a user, I want to import my Notion export so I can switch without retyping.
- As a user, I want to export a page or the whole workspace to open formats.
- As a user, I want automatic daily backups and a simple way to restore one.

**Functional requirements.**

- FR-8.1 (P1) Export a page or subtree to Markdown (with an assets folder), HTML and PDF (via print), preserving headings, lists, to-dos, code blocks, tables, callouts (as blockquotes with an emoji) and images.
- FR-8.2 (P1) Full workspace export: a ZIP whose folders mirror the page tree, with Markdown files, assets and a lossless JSON dump of pages, databases, properties and views.
- FR-8.3 (P1) Import Markdown: single files and folders; folders become the page hierarchy; front matter title and tags map to title and properties; relative image links are copied into attachments; wiki-style links resolve to page links where the target exists.
- FR-8.4 (P1) Import a Notion export (Markdown and CSV ZIP): page hierarchy, databases from CSV, images; Notion's ID suffixes are stripped from titles; an import report lists anything that could not be converted.
- FR-8.5 (P1) Automatic backups: a consistent snapshot of the database (using the SQLite backup API) plus attachments written to a user-chosen folder, daily on startup or close, keeping the last 14 daily and 8 weekly copies; last backup status is visible.
- FR-8.6 (P1) Restore: choose a backup, preview it (date, page count), then restore into a new workspace copy or replace the current one after a safety backup.
- FR-8.7 (P1) CSV import and export for databases (shared with F6).
- FR-8.8 (P2) Obsidian vault import, Evernote ENEX import, export to a static HTML site, scheduled export to a Git repository.

**Non-functional requirements.**

- Import of 2,000 Markdown files in under 60 seconds, running in a worker with a progress bar and a cancel button.
- Each import run is transactional: all or nothing.
- Exports never modify data.

**UX notes.** Import and Export live in Settings and in the page menu. The import report is an ordinary page that can be reviewed and deleted. Backup status is visible but not intrusive.

**Success metrics.**

- The owner's real notes import with zero silently dropped blocks (the report accounts for everything).
- A full export imported into a fresh install round-trips 100% of pages and databases.
- Restore is verified from a real backup every month.

**Dependencies and risks.**

- Depends on F1 (block schema), F2 (hierarchy), F3 (attachments), F6 (CSV).
- Risk: fidelity gaps for blocks Markdown cannot express (toggles, callouts, tables). Mitigation: document the mappings in the import report and keep the JSON export lossless.
- Risk: Notion's export format changes. Mitigation: keep fixture exports in the test suite.
- Risk: large attachments exhaust memory. Mitigation: stream file copies.

**Acceptance criteria.**

- Given a folder of nested Markdown files and images, when I import it, then the page tree mirrors the folders and the images display.
- Given backups are enabled, when I close the app more than 24 hours after the last backup, then a new backup file exists in the chosen folder and copies beyond the retention rules are removed.
- Given a backup file, when I restore it into a new workspace, then all pages, databases and attachments are present.

## 13. F9 — Sync, Accounts and Sharing

**Priority:** P2 (groundwork P0 in v1) | **Phase:** Post-v1

**Problem.** Once LifeOS is the daily system, a second device or a collaborator is the natural next need. Retrofitting sync into an app that was not designed for it is one of the costliest rewrites in software, so this PRD defines the target and the v1 groundwork even though the full feature ships later.

**Goals.**

- Keep multiple devices in sync with no lost edits.
- Optional accounts; the app stays fully usable offline and without one.
- Share individual pages read-only.

**Non-goals.** Real-time multi-cursor collaboration in the first sync release, enterprise permissions or SSO, publishing whole workspaces to the web.

**User stories.**

- As a user, I want my notes on two computers to stay in sync automatically.
- As a user, I want to keep working offline and have changes merge when I reconnect.
- As a user, I want to share one page as a read-only link.
- As a user, I want synced data encrypted so the server operator cannot read it (decision pending).

**Functional requirements.**

- FR-9.1 (P0 in v1) Sync-ready primitives are delivered by F3 (FR-3.5): unique IDs, UTC timestamps, tombstones, device ID and change log. Gate: no v1 table ships without them.
- FR-9.2 (P2) Accounts: email and OAuth login, device registration and list, sign out and revoke a device.
- FR-9.3 (P2) Sync engine: push and pull of change-log entries; last-writer-wins at block level in the first release; conflicting edits to the same block create a visible conflict copy instead of silent loss; attachments sync by content hash.
- FR-9.4 (P2) Offline queue with retry and backoff; a status indicator (synced, syncing, offline, error); a manual sync button.
- FR-9.5 (P2) Optional end-to-end encryption: keys derived from a passphrase and held only on devices, with a recovery key flow. Decision required: E2EE versus simplicity (search and sharing are harder with E2EE).
- FR-9.6 (P2) Sharing v1: a read-only, revocable link for a page and its sub-pages, rendered by a lightweight web viewer.
- FR-9.7 (P3) Roles (owner, editor, viewer), invite by email, real-time collaboration using a CRDT such as Yjs, comments and mentions, a mobile companion app.

**Non-functional requirements.**

- Initial sync of a 5,000-page workspace in under 5 minutes on broadband; incremental sync within 5 seconds.
- Conflicts never drop edits; sync tolerates flaky networks.
- Hosting stays within a hard monthly cost ceiling.

**Backend options.** Supabase (Postgres, auth and storage) for the fastest path, or a small custom Node service. Decide when P2 work starts.

**Success metrics.**

- Zero lost edits across 100 scripted two-device conflict tests.
- A second device is current within 5 seconds of an edit.
- Fewer than 1% of syncs in normal use produce a conflict copy.

**Dependencies and risks.**

- Depends on F3 groundwork, F8 (backup as a safety net) and a hosted backend.
- Risk: CRDT complexity. Mitigation: start with last-writer-wins per block and upgrade only if conflicts prove painful.
- Risk: encryption complicates server-side features. Mitigation: decide early and document what the server can see.
- Risk: hosting and operations burden for a solo project. Mitigation: free-tier hosting with a cost ceiling and an offline-first design that tolerates downtime.

**Acceptance criteria (when built).**

- Given two online devices, when I edit a page on A, then it appears on B within 5 seconds.
- Given B is offline and both devices edited the same block, when B reconnects, then a conflict copy is created and no edit is lost.
- Given a shared link, when I revoke it, then the link stops working immediately.

## 14. F10 — Life OS Starter Pack

**Priority:** P1 | **Phase:** 3

**Problem.** The Life OS model — tasks, habits, habit log, goals and milestones — must not exist as dedicated code, tables or screens (an explicit product rule). The whole system has to come out of the generic database features (F6) and the daily habit check-in automation (FR-7.10). The starter pack is the built-in blueprint that assembles those generic pieces in one action and proves the thesis.

**Goals.**

- One-click setup creates the databases and the Home page, ready to use.
- Nothing is dedicated code: everything is rows, properties, views, filters and rollups that the user can edit or delete like anything else.

**Non-goals.** Habit, task and goal features as dedicated screens, tables or engines. No module-level engine: the pack is a blueprint, and deleting it must not break the app.

**User stories.**

- As the owner, I want a one-click Life OS setup so I start tracking tasks, habits and goals immediately.
- As the owner, I want the setup to be an editable blueprint, so I can rename properties, add views or discard the whole pack without breaking anything.
- As the owner, I want goal progress to be derived, not hand-maintained, so a milestone closing automatically moves its goal.

**Functional requirements.**

- FR-10.1 (P1) One-click setup creates five databases plus the Home page:
  - **Tasks:** Name, Status (Not started / In progress / Done), Due, Priority (Low/Medium/High), Goal (relation), Milestone (relation). Done once.
  - **Habits:** Name, Active (checkbox), Goal (relation), Logs (relation, two-way), Streak (rollup), Completion 30 days (rollup).
  - **Habit Log:** Habit (relation), Date, Done (checkbox). One row per habit per day; a missing row counts as not done; indexed on (habit_id, date). About 365 rows per habit per year.
  - **Goals:** Name, Status, Target date, Milestones (relation, two-way), Habits (relation), Progress (rollup: percent of milestones Done).
  - **Milestones:** Name, Goal (relation), Due, Status, Tasks (relation, two-way), Progress (rollup: percent of tasks Done).
  - **Home page** with linked views (FR-6.13): today's tasks (Status not Done, due today or earlier), today's habit log, active goals with progress; and chart views (FR-6.14): habit completions per day (last 7 days) and tasks completed per week.
- FR-10.2 (P1) Everything above is built from generic database features and FR-7.10, and ships as a built-in blueprint the user can edit or delete.

**Dependencies and risks.**

- Depends on F6 relations, rollups, linked and chart views (FR-6.11, FR-6.13–FR-6.15) and on FR-7.10.
- Risk: the pack tempts hard-coded "habit" logic back in. Mitigation: the acceptance criteria below are the gate; no code path may reference the pack's databases by name except the setup itself.

**Acceptance criteria.**

- Given the starter pack is installed, when I check a Habit Log row, then the habit's Streak and Completion 30 days and the Home page chart update.
- Given all tasks of a milestone are marked Done, when I look at the Milestones and Goals pages, then both Progress rollups reflect it.
- Given the pack exists, when I delete the Habits database, then the rest of the workspace keeps working.

## 15. Release Plan

Assumes one developer at roughly 8-10 productive hours per week. Estimates are rough; the best way to pull a date in is to cut scope, not hours.

- **Phase 0 — Foundations (weeks 1-2):** Electron and Next.js static export shell, typed IPC, SQLite with migrations, theming, CI build for the primary OS. Exit: the app opens, saves and reloads a page.
- **Phase 1 — Usable core (weeks 3-9):** F1, F2, F3 and F4 at P0. Exit: all daily notes can be taken in LifeOS (dogfood alpha) and 50 forced-kill tests lose no data. After this phase the owner dogfoods for 1-2 weeks before Phase 2 starts.
- **Phase 2 — Daily driver (weeks 10-16), in this order:** settings window (FR-4.10, including trash retention FR-2.6 and data location FR-3.10), automatic backup and restore (FR-8.5, FR-8.6), templates and the daily note (FR-7.1-7.5), command registry, quick switcher, palette and in-page find (FR-5.1, FR-5.5, FR-5.6), full-text search with FTS5 (FR-5.2-5.4, FR-5.7), quick capture and tray (FR-4.6, FR-4.7), version history, integrity check and crash recovery (FR-3.7-3.9), favorites, back/forward, recents, duplicate and page options (FR-2.8-2.10, FR-2.12), export and import (FR-8.1-8.4), and page links, backlinks, multi-block selection and deep links (FR-1.11-1.13, FR-2.11, FR-4.9). Exit: the owner has retired their previous notes app for daily use.
- **Phase 3 — Structured data and the life system (weeks 17-26), in this order:** database model, table view and the Status property (FR-6.1-6.4, FR-6.7), saved views, relative-date filters, sorts, property management, defaults and linked views (FR-6.5, FR-6.6, FR-6.8, FR-6.13, FR-6.15), two-way relations (FR-6.11), rollups and the limited formula set (FR-6.11), board and calendar views (FR-6.10), chart views (FR-6.14), database templates and the daily habit check-in automation (FR-7.6, FR-7.10), the Life OS starter pack (F10), and CSV import and export (FR-6.9, FR-8.7). Exit: the Life OS starter pack runs entirely on generic features.
- **Phase 4 — Polish and distribution (weeks 27-30):** auto-update, code signing, performance and accessibility passes, documentation, macOS and Linux builds. Exit: v1.0 tag.
- **Post-v1:** F9 sync and sharing, encryption, mobile companion.

Realistic total to v1 is about 7 months at this pace. If the date matters more than completeness, cut in this order: general formulas (the fixed function set stays), the calendar view, version history, import from Notion.

## 16. Product-Level Success Metrics

- **Adoption:** LifeOS is opened on at least 6 of 7 days for 4 consecutive weeks; at least 90% of new notes are created in it; the previous notes app is no longer used.
- **Quality:** zero data-loss incidents; crash-free sessions of at least 99.5%; cold start under 2 seconds; input latency p95 under 50 ms.
- **Trust:** the number of times the owner reaches for another tool to do something LifeOS should do, tracked in a simple log, falls below one per week.
- **Delivery:** each phase's exit criteria are met before the next phase starts; scope changes are logged.

## 17. Key Risks and Mitigations

- **Scope creep (Notion is enormous).** Strict P0/P1/P2 tiers; new ideas go to a backlog; a feature enters v1 only if its absence blocks daily use.
- **Limited solo capacity.** Phases are sized to about 10 hours a week; cut views and history before cutting reliability.
- **Editor complexity.** Use Tiptap; time-box every custom node.
- **Data loss or corruption.** F3 acceptance gates, a backup before every migration, forced-kill tests in CI.
- **Desktop packaging.** Set up CI builds per OS in Phase 0; pin native module versions.
- **Retrofitting sync.** The sync-ready data model is mandatory from the first table.
- **Competing priorities.** Dogfood at the end of Phase 1 so the tool starts paying for itself early.

## 18. Open Questions

1. Which OS is the primary target for the first release? This decides the first CI target and the code-signing setup.
2. Electron is the working choice. Confirm it with a one-day spike measuring memory use and startup time, or switch to Tauri if the footprint is unacceptable.
3. Is mobile access needed within the first year? If so, bring sync forward and consider a companion web app.
4. Is encryption at rest (F3, P2) or end-to-end encryption (F9) required, and is an app lock needed from v1?
5. Is there existing Notion or Markdown content to migrate? This determines how early the importers in F8 are needed.
6. The name LifeOS suggests life management beyond notes (habits, goals, finances). **Decided (Rev 1.1): confirmed** — these are database rows plus a built-in blueprint (F10) on top of F6, never dedicated modules; FR-7.10 provides the only automation.
