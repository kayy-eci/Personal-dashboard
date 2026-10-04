# Data safety

LifeOS stores all data in the browser's IndexedDB (`lifeos` database) via Dexie.
Browser storage can be cleared by the OS or browser, so the app protects your
data in layers:

1. **Persistent storage.** On startup the app asks the browser for
   `navigator.storage.persist()`. If granted, the browser is asked not to
   evict your data automatically. Check status in Settings → Data.
2. **Export / Import.** Settings → Data offers a versioned JSON export
   (`lifeos-export-YYYYMMDD-HHMMSS.json`) and a validated Import. The export
   is checksum-verified and excludes the GitHub token. Importing replaces all
   current data after confirmation.
3. **Same URL forever.** Browser storage belongs to the exact origin
   (scheme + host + port). Changing the domain starts with a fresh database —
   move data with export/import before switching.

## Backup folder

Chromium-based browsers let you point LifeOS at a local folder
(`FileSystemDirectoryHandle`). If supported, you can schedule and trigger
backups there. Store the folder inside OneDrive/Dropbox/Google Drive for a
free off-device copy. Firefox and Safari do not support folder access; rely on
export/import there.

## Keeping your data safe (summary)

- Check **Settings → Data → Storage** periodically.
- Export a backup before any major change.
- Don't clear site data unless you have an export.
- Don't change the app's URL unless you plan to migrate with export/import.
