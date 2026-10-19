/**
 * FR-1.7 + FR-1.1 e2e: the drag-handle menu and unique block ids on
 * duplicate/paste (Playwright _electron).
 *
 * The drag handle is a single floating grip that tracks the hovered block
 * (the extension keeps it visibility:hidden until a block is hovered), so
 * every menu action is opened by hovering a block first.
 *
 * Flow: create a page, type two blocks, then through the grip menu:
 * Turn into → Heading 2, Color → Red, Duplicate, Delete. Afterwards a
 * full-document copy-paste must not duplicate any data-block-id, and the
 * saved document holds exactly as many ids as top-level blocks, all unique.
 *
 * Usage: node tests/block-menu.e2e.mjs (requires `npm run build` output).
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { _electron as electron } from "playwright";
import Database from "better-sqlite3";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function step(name) {
  console.log(`[step] ${name}`);
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

/** Hover the block at `index`, click its grip, and return the open menu. */
async function openMenu(window, index) {
  const block = window
    .locator(".page-doc-content .ProseMirror > *")
    .nth(index);
  await block.waitFor({ state: "visible", timeout: 5000 });
  await block.hover();
  const grip = window.locator(".page-doc .drag-grip");
  await grip.waitFor({ state: "visible", timeout: 5000 });
  await grip.click({ force: true });
  const menu = window.locator(".block-menu");
  await menu.waitFor({ state: "visible", timeout: 5000 });
  return menu;
}

async function main() {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), "lifeos-block-menu-"));
  const failures = [];
  let app = null;

  try {
    const launch = await launchApp(userDataDir);
    app = launch.app;
    const { window } = launch;

    // First launch on an empty workspace.
    step("create page");
    await window.getByRole("button", { name: "Create a page" }).click({ timeout: 20000 });
    const editor = window.locator(".page-doc-content .ProseMirror");
    await editor.waitFor({ state: "visible", timeout: 20000 });
    await editor.click();
    await window.keyboard.type("Blok pertama.");
    await window.keyboard.press("Enter");
    await window.keyboard.type("Blok kedua.");
    await delay(100);

    step("open menu 1 (turn into)");
    let menu = await openMenu(window, 1);
    await menu.getByText("Turn into").click();
    await menu.getByText("Heading 2").click();
    await menu.waitFor({ state: "hidden" });
    const heading = editor.locator("h2").filter({ hasText: "Blok kedua." });
    if ((await heading.count()) !== 1) {
      failures.push("Turn into → Heading 2 did not become an h2");
    }

    step("open menu 2 (color)");
    menu = await openMenu(window, 1);
    await menu.getByText("Color").click();
    await menu.getByText("Red", { exact: true }).click();
    await menu.waitFor({ state: "hidden" });
    await window
      .locator("h2 span[style*='rgb(168, 85, 86)']")
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => failures.push("Color → Red did not color the h2 span"));

    step("open menu 3 (duplicate)");
    menu = await openMenu(window, 0);
    await menu.getByText("Duplicate").click();
    await menu.waitFor({ state: "hidden" });
    await delay(100);
    const paragraphs = editor.locator("> p").filter({ hasText: "Blok pertama." });
    if ((await paragraphs.count()) !== 2) {
      failures.push(`Duplicate did not add a block (copies=${await paragraphs.count()})`);
    }

    step("open menu 4 (delete)");
    menu = await openMenu(window, 1);
    await menu.getByText("Delete").click();
    await menu.waitFor({ state: "hidden" });
    await delay(100);
    if ((await paragraphs.count()) !== 1) {
      failures.push(`Delete did not remove the duplicate (copies=${await paragraphs.count()})`);
    }

    // Full-document copy → paste: pasted copies must get fresh unique ids.
    step("copy-paste unique ids");
    await editor.click();
    await window.keyboard.press("Control+A");
    await window.keyboard.press("Control+C");
    await window.keyboard.press("Control+End");
    await window.keyboard.press("Enter");
    await window.keyboard.press("Control+V");
    await delay(300);
    const domIds = await editor.evaluate(() => {
      const element = document.querySelector(".page-doc-content .ProseMirror");
      if (!element) return [];
      return [...element.querySelectorAll("[data-block-id]")].map(
        (node) => node.getAttribute("data-block-id"),
      );
    });
    console.log(`[step] domIds=${JSON.stringify(domIds)}`);
    if (domIds.length !== 4) {
      failures.push(`paste produced ${domIds.length} data-block-id nodes, expected 4`);
    }
    if (new Set(domIds).size !== domIds.length) {
      failures.push("pasted blocks reused existing block ids");
    }

    // Persistence: the saved document is normalized and unique at rest.
    step("close & inspect db");
    await app.close();
    app = null;
    const database = new Database(path.join(userDataDir, "lifeos.sqlite"));
    try {
      const row = database
        .prepare("SELECT content_json FROM pages WHERE deleted_at IS NULL")
        .get();
      const document = JSON.parse(row.content_json);
      const ids = document.content.map((node) => node.attrs?.id);
      const nonEmpty = ids.filter((id) => typeof id === "string" && id !== "");
      if (nonEmpty.length !== document.content.length) {
        failures.push("stored document holds blocks without an id");
      }
      if (new Set(nonEmpty).size !== nonEmpty.length) {
        failures.push("stored document holds duplicate block ids");
      }
      if (nonEmpty.length !== 4) {
        failures.push(`stored document holds ${nonEmpty.length} blocks, expected 4`);
      }
      // quickCheck as a cheap durability signal.
      const check = database.pragma("quick_check", { simple: true });
      if (check !== "ok") failures.push(`quick_check was ${check}`);
    } finally {
      database.close();
    }
  } catch (error) {
    failures.push(
      `unexpected error: ${String(error?.message ?? error)
        .split("\n")
        .map((line) => line.trim())
        .slice(0, 6)
        .join(" | ")}`,
    );
    step(`error: ${failures[failures.length - 1]}`);
    try {
      await app?.close();
      app = null;
    } catch {
      app = null;
    }
  } finally {
    // Windows keeps handles briefly after close; best-effort cleanup only.
    try {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3 });
    } catch (error) {
      console.log(`cleanup skipped: ${String(error?.message ?? error)}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error("block-menu e2e: FAILED");
    process.exitCode = 1;
  } else {
    console.log("block-menu e2e: ALL PASS");
  }
}

await main();
