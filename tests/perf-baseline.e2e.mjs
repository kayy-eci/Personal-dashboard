/**
 * Performance baseline (P0 close-out): a repeatable measurement harness so
 * regressions land against known numbers instead of a feeling.
 *
 * Metrics, each measured in-process against the real app build:
 *  - startupMs    Electron launch → window domcontentloaded.
 *  - pageReadyMs  "Create a page" click → the page editor is visible.
 *  - typeMsPerKey 150 keystrokes with no delay → average per keystroke.
 *  - autosaveMs   Last keystroke → the save indicator returns to "Saved".
 *
 * Usage: node tests/perf-baseline.e2e.mjs
 *   LIFEOS_PERF_RUNS=N (default 3); every run gets a fresh workspace.
 *   Requires `npm run build` output (out/ + dist-electron/).
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { _electron as electron } from "playwright";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const runs = Math.max(
  1,
  Number.parseInt(process.env.LIFEOS_PERF_RUNS ?? "3", 10) || 3,
);
const typingText = "baseline ketikan ".repeat(10).trim();

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function runOnce(label) {
  const userDataDir = mkdtempSync(
    path.join(os.tmpdir(), `lifeos-perf-${label}-`),
  );
  const failures = [];
  let app = null;
  const result = {
    label,
    startupMs: null,
    pageReadyMs: null,
    typeMsPerKey: null,
    autosaveMs: null,
  };
  try {
    const launchStart = performance.now();
    app = await electron.launch({
      args: ["."],
      cwd: projectRoot,
      env: { ...process.env, LIFEOS_USER_DATA_DIR: userDataDir },
      timeout: 120000,
    });
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    result.startupMs = Math.round(performance.now() - launchStart);

    // Empty workspace: create the page the measurements run against.
    const pageStart = performance.now();
    await window
      .getByRole("button", { name: "Create a page" })
      .click({ timeout: 20000 });
    const editor = window.locator(".page-doc-content .ProseMirror");
    await editor.waitFor({ state: "visible", timeout: 30000 });
    result.pageReadyMs = Math.round(performance.now() - pageStart);

    // Type the baseline text with zero per-key delay; throughput (ms per
    // keystroke) is the responsiveness proxy for typing.
    await editor.click();
    await window.keyboard.press("Control+End");
    await delay(250);
    const typedText = `${typingText} ${label}.`;
    const typingStart = performance.now();
    await window.keyboard.type(typedText, { delay: 0 });
    result.typeMsPerKey =
      Math.round(((performance.now() - typingStart) / typedText.length) * 10) /
      10;

    // Autosave: last keystroke → indicator is back to "Saved" (debounce
    // 500 ms). Let the dirty flip settle first so we wait for the new save.
    await delay(100);
    const autosaveStart = performance.now();
    await window
      .locator('[data-save-status="saved"]')
      .waitFor({ state: "visible", timeout: 15000 });
    result.autosaveMs = Math.round(performance.now() - autosaveStart);

    await app.close();
    app = null;
  } catch (error) {
    failures.push(
      `unexpected error: ${String(error?.message ?? error).split("\n")[0]}`,
    );
    try {
      await app?.close();
      app = null;
    } catch {
      app = null;
    }
  } finally {
    try {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3 });
    } catch (error) {
      console.log(`cleanup skipped: ${String(error?.message ?? error)}`);
    }
  }
  for (const failure of failures) {
    console.error(`  - ${label}: ${failure}`);
    process.exitCode = 1;
  }
  return result;
}

async function main() {
  const rounds = [];
  for (let index = 1; index <= runs; index += 1) {
    const label = `r${index}`;
    console.log(`run ${label} …`);
    rounds.push(await runOnce(label));
  }
  const usable = (key) => rounds.filter((item) => item[key] !== null);
  const average = (key) => {
    const list = usable(key);
    if (list.length === 0) return null;
    return (
      Math.round(
        (list.reduce((sum, item) => sum + item[key], 0) / list.length) * 10,
      ) / 10
    );
  };
  console.log("performance baseline (LifeOS)");
  console.table(rounds);
  console.log(
    JSON.stringify({
      runs,
      startupMs: average("startupMs"),
      pageReadyMs: average("pageReadyMs"),
      typeMsPerKey: average("typeMsPerKey"),
      autosaveMs: average("autosaveMs"),
    }),
  );
}

await main();
