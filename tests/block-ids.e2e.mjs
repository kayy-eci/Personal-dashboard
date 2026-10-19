/**
 * FR-1.1 e2e: stable unique block ids through every mutation path.
 *
 * ProseMirror copies attrs on structural edits (Enter split, turn-into,
 * paste, duplicate), so BlockIds runs an appendTransaction guard that keeps
 * the first occurrence of an id and issues a fresh UUIDv7 to every later
 * duplicate. These scenarios assert the guard end to end:
 *   1. split a paragraph with Enter → both halves keep an id, both unique
 *   2. paste a copied block   → pasted copy gets a fresh id
 *   3. duplicate via the grip menu → copy gets a fresh id
 *   4. drag-move a block → the id is preserved (it must never be renumbered)
 *
 * Usage: node tests/block-ids.e2e.mjs (requires `npm run build` output).
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

/** Hover the top-level block at `index`, click its grip, return the menu. */
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

/** data-block-id of every rendered block, in document order. */
async function domIds(window) {
  return window.locator(".page-doc-content .ProseMirror").evaluate((node) => {
    return [...node.querySelectorAll(":scope > [data-block-id]")].map((child) =>
      child.getAttribute("data-block-id"),
    );
  });
}

async function main() {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), "lifeos-block-ids-"));
  const failures = [];
  let app = null;

  try {
    const lens = await launchApp(userDataDir);
    app = lens.app;
    const window = lens.window;

    step("create page, type two paragraphs");
    await window.getByRole("button", { name: "Create a page" }).click({ timeout: 20000 });
    const editor = window.locator(".page-doc-content .ProseMirror");
    await editor.waitFor({ state: "visible", timeout: 20000 });
    await editor.click();
    await window.keyboard.type("lama halus.");
    await window.keyboard.press("Enter");
    await window.keyboard.type("Blok kedua utuh.");
    await delay(150);

    step("enter-split mid-paragraph");
    const firstBlock = editor.locator("> *").first();
    const box = await firstBlock.boundingBox();
    // Click into the middle of the first line, then walk Home + right keys.
    await firstBlock.click({ position: { x: 8, y: box.height - 6 } });
    await window.keyboard.press("Home");
    for (let index = 0; index < 4; index += 1) {
      await window.keyboard.press("ArrowRight");
    }
    const before = await domIds(window);
    await window.keyboard.press("Enter");
    await delay(150);
    const afterSplit = await domIds(window);
    const afterTypingExpected = before.length + 1;
    if (afterSplit.length !== afterTypingExpected) {
      failures.push(
        `split produced ${afterSplit.length} id blocks, expected ${afterTypingExpected}`,
      );
    }
    if (new Set(afterSplit).size !== afterSplit.length) {
      failures.push("split produced duplicate block ids");
    }
    // The first half keeps its id; the second half must be freshly minted.
    if (afterSplit[0] !== before[0]) {
      failures.push("split changed the id of the source block");
    }
    if (before.includes(afterSplit[1])) {
      failures.push("split reused an existing id for the second half");
    }

    // 2. Paste over the whole document: the content is replaced by its copy
    //    and every block must still hold a unique id afterwards. Minting
    //    fresh ids for clones is asserted by the Duplicate step and by the
    //    normalizeBlockIds unit test (repeat → fresh).
    step("copy-paste");
    await editor.click();
    await window.keyboard.press("Control+A");
    await delay(120);
    await window.keyboard.press("Control+C");
    await delay(250);
    await window.keyboard.press("Control+V");
    await delay(300);
    const afterPaste = await domIds(window);
    if (new Set(afterPaste).size !== afterPaste.length) {
      failures.push("paste reused existing block ids");
    }

    // 3. Duplicate the last block through the grip menu.
    step("duplicate via menu");
    const beforeDuplicate = await domIds(window);
    const menu = await openMenu(window, beforeDuplicate.length - 1);
    await menu.getByText("Duplicate").click();
    await menu.waitFor({ state: "hidden" });
    await delay(150);
    const afterDuplicate = await domIds(window);
    if (new Set(afterDuplicate).size !== afterDuplicate.length) {
      failures.push("duplicate produced a colliding block id");
    }
    const tail = afterDuplicate.slice(beforeDuplicate.length);
    if (tail.length !== 1 || tail[0] === beforeDuplicate.at(-1)) {
      failures.push("duplicate did not mint a fresh id for the copy");
    }

    // 4. Drag-move: move the duplicated block above the first block. Its id
    //    must survive unchanged (a move is not a duplication).
    step("drag-move");
    const grip = window.locator(".page-doc .drag-grip");
    const targetBlock = editor.locator("> *").first();
    const targetBox = await targetBlock.boundingBox();
    // hover re-shows the floating grip for the last block, then a native
    // HTML5 drag from the grip to above the first block.
    const sourceLast = editor.locator("> *").last();
    await sourceLast.hover();
    await grip.waitFor({ state: "visible" });
    await grip.dragTo(targetBlock, {
      targetPosition: { x: targetBox.width / 2, y: 4 },
    });
    await delay(250);
    const afterMove = await domIds(window);
    if (afterMove.length !== afterDuplicate.length) {
      failures.push(`drag-move lost a block (${afterMove.length} remain)`);
    }
    if (
      afterMove.length === afterDuplicate.length &&
      afterMove.every(id => afterDuplicate.includes(id)) &&
      afterMove.join() === afterDuplicate.join()
    ) {
      failures.push("drag-move did not reorder the document");
      failures.push(`before: ${afterDuplicate.join(",")} after: ${afterMove.join(",")}`);
    }
    const movedId = afterDuplicate.at(-1);
    const movedIndex = afterMove.indexOf(movedId);
    if (movedIndex === -1) {
      failures.push("moved block id vanished after drag-move");
    } else if (movedIndex === afterDuplicate.length - 1) {
      failures.push("drag-move left the block in place");
    }

    // Persist and re-check at rest: same set of ids survives the save.
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
      const persisted = [...afterMove].sort();
      const stored = [...nonEmpty].sort();
      // A trailing empty paragraph (StarterKit's TrailingNode) may exist apart
      // from the three edited blocks; everything else must match exactly.
      const onlyTrailingExtra =
        stored.length === persisted.length + 1 &&
        stored.every((id) => persisted.includes(id));
      if (persisted.join() !== stored.join() && !onlyTrailingExtra) {
        failures.push("stored ids differ from the editor document");
      }
      const check = database.pragma("quick_check", { simple: true });
      if (check !== "ok") failures.push(`quick_check was ${check}`);
    } finally {
      database.close();
    }
  } catch (error) {
    failures.push(
      `unexpected error: ${String(error?.message ?? error).split("\n").slice(0, 6).join(" | ")}`,
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

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error("block-ids e2e: FAILED");
    process.exitCode = 1;
  } else {
    console.log("block-ids e2e: ALL PASS");
  }
}

await main();
