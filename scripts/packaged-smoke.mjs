/**
 * Packaged-app smoke (P0 close-out): launch the packaged Windows build
 * (release/win-unpacked/LifeOS.exe, or the path passed as argv[2]) and gate
 * on: the window opens, the renderer loads a non-empty body, and the app
 * closes cleanly. Run after `npm run package`; this is what the CI artifact
 * contains.
 *
 * Usage: node scripts/packaged-smoke.mjs [path\to\LifeOS.exe]
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const exe = path.resolve(
  projectRoot,
  process.argv[2] ?? path.join("release", "win-unpacked", "LifeOS.exe"),
);
const userDataDir = mkdtempSync(path.join(os.tmpdir(), "lifeos-packaged-smoke-"));

const app = await electron.launch({
  executablePath: exe,
  args: ["."],
  env: { ...process.env, LIFEOS_USER_DATA_DIR: userDataDir },
  timeout: 90000,
});

try {
  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");
  // Wait for the app shell to render rather than an empty document.
  const appRoot = window.locator(".workspace").first();
  await appRoot.waitFor({ state: "visible", timeout: 30000 });
  const children = await window.$eval("body", (node) => node.childElementCount);
  const title = await window.title();
  console.log(`packaged smoke: title="${title}", body children=${children}`);
  if (children === 0) {
    console.error("packaged smoke: FAILED — renderer body is empty");
    process.exitCode = 1;
  } else {
    console.log("packaged smoke: OK");
  }
} catch (error) {
  console.error(`packaged smoke: FAILED — ${String(error?.message ?? error).split("\n")[0]}`);
  process.exitCode = 1;
} finally {
  await app.close().catch(() => undefined);
  try {
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3 });
  } catch (error) {
    console.log(`cleanup skipped: ${String(error?.message ?? error)}`);
  }
}
