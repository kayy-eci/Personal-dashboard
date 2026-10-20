<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Roadmap

- 10b Page header (FR-2.14): icon + cover + title above every page.
- 11 Settings window (FR-4.10): trash retention (FR-2.15), data location (FR-3.10).

## Status (Step 10 — 2026-10-20)

### P0 requirements not yet verified done
- FR-1.8 image paste (clipboard image → image block + file in attachments folder) — no automated test; verify by hand.
- FR-1.11 internal `[[page]]` links and the backlinks panel (FR-2.11) — no e2e; verify by hand.
- F2 sidebar UI interactions (drag-move pages, collapse/expand persistence, 200–480 px resize) — no e2e; verify by hand.
- F5 search (Cmd/Ctrl+K, ranking, open result) — no e2e; verify by hand.
- FR-4.5 clean-machine installer verification — deferred to the user's dogfooding period; see CI instructions below.
- FR-2.6 trash retention configurability — deferred to Step 11 (Settings), tied to FR-4.10.

### CI: how to run the workflow and verify the installer on a clean Windows machine
1. Push the branch (`git push origin feature/lifeos-p0`) or run `gh workflow run build.yml --ref feature/lifeos-p0`. The workflow also triggers on every push to `main` or `feature/**`.
2. Open the Actions tab, wait for `build-windows` to finish, then download the `LifeOS-windows-installer` artifact (`LifeOS Setup 0.1.0.exe`).
3. On a clean Windows machine: run the installer (NSIS, unsigned — SmartScreen warning expected, click "More info → Run anyway"), let it install into `%LOCALAPPDATA%\Programs\LifeOS` (or the chosen dir).
4. Launch "LifeOS" from the Start menu. Confirm the app window opens and the database is created at `%APPDATA%\LifeOS\lifeos.sqlite` (or under `LIFEOS_USER_DATA_DIR` if set).
5. Create a page, type several blocks, close the app, relaunch, confirm the content persisted (read/write round trip).
6. Optional durability check: run `npm run test:forced-kill` against a dev build before shipping.
7. Do NOT mark FR-4.5 done until this clean-machine run is confirmed by the user.

### Next named step
Step 11 — Settings window (FR-4.10): trash retention (FR-2.6), data location (FR-3.10). Do not start until the user names it.
