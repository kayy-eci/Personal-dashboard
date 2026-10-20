<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Roadmap

- 10b Page header (FR-2.14): icon + cover + title above every page.
- 11 Settings window (FR-4.10): trash retention (FR-2.15), data location (FR-3.10).

## Status (Step 10b + 10b-fix — 2026-10-20)

### Delivered
- FR-2.14 page header: icon + cover + title above every page (P1).
- Step 10b-fix layout: cover is full-bleed across the main pane (`clamp(180px, 30vh, 400px)`, no top/side margin, no rounded corners, `object-fit: cover` centered); icon is 78 x 78 px, left-aligned with the content column and overlaps the cover's bottom edge by half (margin-top -39 px; 24 px top padding without a cover); title is 40/48 px bold with its top edge 72 px below the cover with an icon, 40 px with a cover only, 24 px from the pane top otherwise; "Saved" stays right-aligned; the "Change cover" toolbar sits 12 px from the cover's top-right and appears on hover or keyboard focus only. Next dev indicator hidden with `devIndicators: false`.
- Data: `pages.icon` / `pages.cover` store `emoji:<char>`, `image:<hash>.<ext>`, `color:<#hex>`; typed validated IPC `pages:set-icon` / `pages:set-cover` (malformed + unknown hash rejected), transactional with `updated_at` + `change_log`.
- Attachments: PNG, JPG, GIF, WebP and AVIF accepted; the type is read from the file's first bytes (not extension or declared MIME); SVG rejected. GIFs are written byte-for-byte (no re-encode) so animation survives. 20 MB attachment cap, 5 MB icon cap; over-limit and unsupported files show clear messages. Picker filters, IPC validators, the `lifeos://` handler (`Content-Type: image/gif`) and CSP `img-src 'self' blob:` all allow GIFs.
- Attachment cleanup treats icon/cover hashes (active + trashed pages) and GIF references as in use.
- UI: `PageHeader` with cover, icon, hover controls, emoji picker (search + type/paste + upload + remove), cover menu (presets + upload + remove); Esc + keyboard nav.
- 16 px icon in sidebar tree and breadcrumbs.
- Tests: 59 unit tests pass; `node tests/page-header.e2e.mjs` verifies the header measurements, the 800 px minimum, the keyboard-revealed cover toolbar, GIF cover/icon/paste byte identity, `image/gif` content type, and GIF animation.

### P0/P1 not yet verified by hand
- FR-1.8 image paste (clipboard → image block + file in attachments) — verify by hand.
- FR-1.11 internal `[[page]]` links + backlinks panel — verify by hand.
- F2 sidebar UI (drag-move pages, collapse/expand persistence, resize) — verify by hand.
- F5 search (Cmd/Ctrl+K, ranking, open result) — verify by hand.
- FR-4.5 clean-machine installer verification — deferred; see CI instructions below.

### How to verify Step 10b-fix by hand
1. At 1920x1080 (maximized app), open a page with a cover: the cover spans the main pane edge to edge and is about 30vh tall (≈324 px at a 1080 px viewport; window chrome makes the renderer slightly shorter). Add an emoji icon: it is 78 x 78 px, straddles the cover's bottom edge by half, is left-aligned with the title, and the title starts 72 px below the cover. Remove the icon: title starts 40 px below. Remove the cover: title starts 24 px from the pane top.
2. Hover the cover: a "Change cover" button appears 12 px from the top-right; Tab to it with the keyboard and it appears too. The menu's presets, upload and remove still work. Hover above the title for "Add icon"/"Add cover".
3. Icon picker: upload a GIF (≤5 MB) from the Upload tab — the picker now lists GIFs, the icon animates, and nothing is re-encoded.
4. Cover menu: upload an animated GIF (≤20 MB) — it animates in the cover. Restart the app: the GIF cover/icon persist and keep animating (check the stored file is the original `.gif`).
5. Image block: `/image` upload, paste and drag-drop an animated GIF — the block animates. Try a text file renamed `.gif`: it is rejected with "This image format is not supported…". Try a file over 20 MB: a clear "maximum size is 20 MB" message appears (icon: 5 MB).
6. Resize the window to 800 px wide and narrow the sidebar/collapse it: the cover still fills the pane, keeps its 180 px minimum height, and the icon/title stay aligned to the 720 px content column. Check light and dark themes.
7. Trash a page with a header image, restore it: icon/cover still present. Run the cleanup helper: referenced header images (including GIFs) survive.
8. Check the sidebar (16 px icon) and breadcrumbs update on change. In dev, the round Next.js indicator no longer covers the sidebar footer.
9. After `npm run build`, run `node tests/page-header.e2e.mjs` for the automated layout/GIF checks.

### CI: clean-machine installer verification
1. Push branch or `gh workflow run build.yml --ref feature/lifeos-p0`; download `LifeOS-windows-installer` artifact.
2. On a clean Windows machine run the installer (unsigned — SmartScreen "More info → Run anyway").
3. Launch LifeOS; confirm DB at `%APPDATA%\LifeOS\lifeos.sqlite`; create a page with icon+cover, type, close, relaunch, confirm persistence.
4. Do not mark FR-4.5 done until confirmed by the user.

### Next named step
Step 11 — Settings window (FR-4.10): trash retention (FR-2.15), data location (FR-3.10). Do not start until the user names it.
