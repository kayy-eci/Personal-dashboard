<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Roadmap

- 10b Page header (FR-2.14): icon + cover + title above every page.
- 11 Settings window (FR-4.10): trash retention (FR-2.15), data location (FR-3.10).

## Status (Step 10b — 2026-10-20)

### Delivered
- FR-2.14 page header: icon + cover + title above every page (P1).
- Data: `pages.icon` / `pages.cover` store `emoji:<char>`, `image:<hash>.<ext>`, `color:<#hex>`; typed validated IPC `pages:set-icon` / `pages:set-cover` (malformed + unknown hash rejected), transactional with `updated_at` + `change_log`.
- Attachment cleanup now treats icon/cover hashes (active + trashed pages) as in use.
- UI: `PageHeader` with cover, icon, hover controls, emoji picker (search + type/paste + upload + remove), cover menu (presets + upload + remove); Esc + keyboard nav.
- 16 px icon in sidebar tree and breadcrumbs.

### P0/P1 not yet verified by hand
- FR-1.8 image paste (clipboard → image block + file in attachments) — verify by hand.
- FR-1.11 internal `[[page]]` links + backlinks panel — verify by hand.
- F2 sidebar UI (drag-move pages, collapse/expand persistence, resize) — verify by hand.
- F5 search (Cmd/Ctrl+K, ranking, open result) — verify by hand.
- FR-4.5 clean-machine installer verification — deferred; see CI instructions below.

### How to verify Step 10b by hand
1. Open a page: hover above the title → "Add icon" and "Add cover" appear. Add an emoji icon and a flat color cover; confirm layout (cover across content width, icon overlapping cover bottom edge, title below). Remove both; confirm controls reappear on hover.
2. Icon picker: search an emoji, type/paste a custom emoji + Enter, switch to Upload tab and upload a PNG/JPG/WebP (≤5 MB) — icon renders as 78 px image. Test Remove.
3. Cover menu: pick a flat preset, upload an image, Remove. Confirm no gradients/text on covers.
4. Restart the app: icon and cover persist.
5. Trash a page that has a header image, then restore it: icon/cover still present.
6. Run the cleanup helper (trigger `cleanupOrphanAttachments` or the weekly job) against a workspace containing a page with a header image: confirm the referenced image file survives (not deleted).
7. Check sidebar (16 px icon, emoji or image) and breadcrumbs (icon before label) update on change.
8. Light and dark themes: pickers and controls readable; Esc closes pickers; Tab/Enter navigate.

### CI: clean-machine installer verification
1. Push branch or `gh workflow run build.yml --ref feature/lifeos-p0`; download `LifeOS-windows-installer` artifact.
2. On a clean Windows machine run the installer (unsigned — SmartScreen "More info → Run anyway").
3. Launch LifeOS; confirm DB at `%APPDATA%\LifeOS\lifeos.sqlite`; create a page with icon+cover, type, close, relaunch, confirm persistence.
4. Do not mark FR-4.5 done until confirmed by the user.

### Next named step
Step 11 — Settings window (FR-4.10): trash retention (FR-2.15), data location (FR-3.10). Do not start until the user names it.
