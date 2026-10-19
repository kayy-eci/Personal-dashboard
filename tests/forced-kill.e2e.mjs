/**
 * FR-3 acceptance: forced-kill durability test (Playwright _electron).
 *
 * Each round: launch LifeOS, type a "stabil" marker, wait long enough for the
 * autosave (1.5 s hard flush + 500 ms debounce + margin), type a "tail"
 * marker and SIGKILL the process immediately, relaunch, then verify with
 * better-sqlite3 that the stabilized text survived and the database passes
 * quick_check. Pass rule: at most 1.5 s of typing may be lost, so the stable
 * marker must always be present (the tail marker may or may not be).
 *
 * Usage: node tests/forced-kill.e2e.mjs
 *   LIFEOS_FORCED_KILL_ROUNDS=50 (default 50)
 * Requires `npm run build` output (out/ + dist-electron/).
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";
import Database from "better-sqlite3";

const rounds = Number.parseInt(
  process.env.LIFEOS_FORCED_KILL_ROUNDS ?? "50",
  10,
);
const roundsPerRun = Number.isFinite(rounds) && rounds > 0 ? rounds : 50;

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
/** Long enough for a 1.5 s hard flush plus the 500 ms debounce to settle. */
const stabilizationWaitMs = 2500;

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function launchApp(userDataDir) {
  const app = await electron.launch({
    args: ["."],
    cwd: projectRoot,
    env: { ...process.env, LIFEOS_USER_DATA_DIR: userDataDir },
    timeout: 60000,
  });
  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");
  return { app, window };
}

async function focusEditor(window) {
  const editor = window.locator(".page-doc-content .ProseMirror");
  await editor.waitFor({ state: "visible", timeout: 20_000 });
  await editor.click();
  // Move the caret to the end of the document before typing.
  await window.keyboard.press("Control+End");
}

function inspectDatabase(userDataDir, marker) {
  const databasePath = path.join(userDataDir, "lifeos.sqlite");
  const sqlite = new Database(databasePath);
  try {
    const quickCheck = sqlite.pragma("quick_check", { simple: true });
    const pages = sqlite
      .prepare("SELECT content_json FROM pages WHERE deleted_at IS NULL")
      .all();
    const surviving = pages.some((page) => page.content_json.includes(marker));
    return { quickCheck, surviving, pageCount: pages.length };
  } finally {
    sqlite.close();
  }
}

async function run() {
  const userDataDir = mkdtempSync(
    path.join(os.tmpdir(), "lifeos-forced-kill-"),
  );
  const failures = [];
  let tailsKept = 0;

  try {
    let created = false;
    for (let round = 1; round <= roundsPerRun; round += 1) {
      const stableMarker = `stabil-${round}`;
      const tailMarker = `tail-${round}`;

      // UI flakes (window closed mid-round) retry once against the same DB;
      // the durability verdict itself always comes from the database.
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const { app, window } = await launchApp(userDataDir);
        let typed = false;
        try {
          if (!created) {
            // First launch on an empty workspace: create the shared test page.
            await window
              .getByRole("button", { name: "Create a page" })
              .click({ timeout: 20_000 });
            created = true;
          }
          await focusEditor(window);
          await window.keyboard.type(`${stableMarker} part satu `, {
            delay: 5,
          });
          // Past validasi: dibandingkan terhadap durasi hard flush + debounce.
          await delay(stabilizationWaitMs);
          await window.keyboard.type(`${tailMarker} dua.`, { delay: 5 });
          typed = true;
          break;
        } catch (error) {
          const failureLine = String(error?.message ?? error).split("\n")[0];
          if (attempt === 2) {
            failures.push(
              `round ${round}: UI error after retry — ${failureLine}`,
            );
          } else {
            console.log(`round ${round}: UI flake, retrying (${failureLine})`);
          }
        } finally {
          // SIGKILL even on a failed attempt: the round still leaves the
          // workspace in a post-kill state for the database inspection.
          app.process().kill("SIGKILL");
          await app.close().catch(() => undefined);
          void typed;
        }
      }

      const result = inspectDatabase(userDataDir, stableMarker);
      console.log(
        `round ${String(round).padStart(2, "")}: quick_check=${result.quickCheck} ` +
          `stabil=${result.surviving ? "kept" : "LOST"} ` +
          `pages=${result.pageCount}`,
      );
      if (result.quickCheck !== "ok") {
        failures.push(`round ${round}: quick_check was ${result.quickCheck}`);
      }
      if (!result.surviving) {
        failures.push(
          `round ${round}: stable marker lost — more than 1.5 s of typing lost`,
        );
      }

      // The tail marker is typed and killed within the lossy window, so it is
      // information only; counting it documents the save cadence in practice.
      const tailDb = new Database(path.join(userDataDir, "lifeos.sqlite"));
      try {
        const rows = tailDb
          .prepare("SELECT content_json FROM pages WHERE deleted_at IS NULL")
          .all();
        if (rows.some((page) => page.content_json.includes(tailMarker))) {
          tailsKept += 1;
        }
      } finally {
        tailDb.close();
      }
    }
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }

  console.log(
    `done: ${roundsPerRun} rounds, tail marker kept in ${tailsKept} (may be up to 1.5 s of typing lost)`,
  );
  if (failures.length > 0) {
    console.error("forced-kill failures:");
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log("forced-kill: ALL PASS");
  }
}

await run();
