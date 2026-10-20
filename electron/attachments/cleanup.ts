import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { attachmentFileNamePattern } from "./store";

/**
 * FR-3.6: weekly orphan attachment cleanup. Content-addressed files that no
 * page (active or in trash) references are removed. Files newer than one day
 * are never deleted: an image may exist on disk briefly before the page save
 * that references it.
 */

const stateFileName = "attachments-cleanup.json";
const cleanupIntervalMs = 7 * 24 * 60 * 60 * 1000;
const recentWindowMs = 24 * 60 * 60 * 1000;

export interface CleanupState {
  lastRun: number | null;
}

/** Extracts every attachment hash referenced by document JSON rows. */
export function collectReferencedHashes(rows: readonly string[]): Set<string> {
  const referenced = new Set<string>();
  for (const row of rows) {
    if (typeof row !== "string") {
      continue;
    }
    // Content JSON stores attachment URLs as /attachment/<hash>.<ext>.
    const urlMatches = row.matchAll(
      /attachment\/([0-9a-f]{64})\.(?:png|jpe?g|gif|webp|avif)/g,
    );
    for (const match of urlMatches) {
      referenced.add(match[1]);
    }
    // Page headers store icon/cover as image:<hash>.<ext>.
    const headerMatches = row.matchAll(
      /image:([0-9a-f]{64})\.(?:png|jpe?g|gif|webp|avif)/g,
    );
    for (const match of headerMatches) {
      referenced.add(match[1]);
    }
  }
  return referenced;
}

export function listOrphanFileNames(
  fileNames: readonly string[],
  referenced: ReadonlySet<string>,
): string[] {
  return fileNames.filter((fileName) => {
    const match = fileName.match(attachmentFileNamePattern);
    return match !== null && !referenced.has(match[1]);
  });
}

export async function readCleanupState(
  userDataDirectory: string,
): Promise<CleanupState> {
  try {
    const raw: unknown = JSON.parse(
      await readFile(join(userDataDirectory, stateFileName), "utf8"),
    );
    if (
      typeof raw === "object" &&
      raw !== null &&
      typeof (raw as { lastRun?: unknown }).lastRun === "number" &&
      Number.isFinite((raw as { lastRun: number }).lastRun)
    ) {
      return { lastRun: (raw as { lastRun: number }).lastRun };
    }
    return { lastRun: null };
  } catch {
    return { lastRun: null };
  }
}

export async function writeCleanupState(
  userDataDirectory: string,
  state: CleanupState,
): Promise<void> {
  await writeFile(
    join(userDataDirectory, stateFileName),
    `${JSON.stringify(state)}\n`,
    "utf8",
  );
}

export function isCleanupDue(
  state: CleanupState,
  now: number,
  intervalMs = cleanupIntervalMs,
): boolean {
  return state.lastRun === null || now - state.lastRun >= intervalMs;
}

export interface AttachmentCleanupResult {
  removed: string[];
}

export async function cleanupOrphanAttachments(options: {
  userDataDirectory: string;
  attachmentsDirectory: string;
  /** contentJson of every page row, including tombstoned pages. */
  readRows: () => Promise<readonly string[]>;
  now: number;
}): Promise<AttachmentCleanupResult | null> {
  const state = await readCleanupState(options.userDataDirectory);
  if (!isCleanupDue(state, options.now)) {
    return null;
  }

  let fileNames: string[];
  try {
    fileNames = await readdir(options.attachmentsDirectory);
  } catch {
    // No attachments yet; still record the run.
    await writeCleanupState(options.userDataDirectory, {
      lastRun: options.now,
    });
    return { removed: [] };
  }

  const rows = await options.readRows();
  const referenced = collectReferencedHashes(rows);
  let removed: string[] = [];
  const orphans = listOrphanFileNames(fileNames, referenced);

  for (const fileName of orphans) {
    const filePath = join(options.attachmentsDirectory, fileName);
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        continue;
      }
      if (options.now - stats.mtimeMs < recentWindowMs) {
        // Could belong to an in-flight paste; leave it for the next run.
        continue;
      }
      await unlink(filePath);
      removed.push(fileName);
    } catch {
      // Unreadable or vanished; skip this run's entry.
    }
  }

  await writeCleanupState(options.userDataDirectory, { lastRun: options.now });
  removed = removed.sort();
  return { removed };
}
