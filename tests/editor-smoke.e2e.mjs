/**
 * FR-1.4 / FR-1.5 / FR-1.10 e2e (Playwright _electron).
 *
 * - /h1 + Enter creates a focused Heading 1 (FR-1.4).
 * - Markdown shortcuts convert as you type: # heading, - bullet,
 *   1. ordered, > quote, [] to-do, ``` code block, --- divider and
 *   `**bold**` / `mono` inline marks (FR-1.5).
 * - A single Ctrl+Z reverts the conversion that just happened, and Ctrl+Z
 *   walks typing back step by step (FR-1.5 / FR-1.10).
 * - Shift+Tab outdents a nested list item (F1 acceptance).
 *
 * Usage: node tests/editor-smoke.e2e.mjs (requires `npm run build` output).
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

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function step(name) {
  console.log(`[step] ${name}`);
}

async function typeLine(window, text, extraKeys = []) {
  for (const chunk of text) {
    await window.keyboard.type(chunk);
    await delay(60);
  }
  for (const key of extraKeys) {
    await window.keyboard.press(key);
    await delay(120);
  }
}

/** Tag names of top-level blocks in document order. */
async function docShape(window) {
  return window.locator(".page-doc-content .ProseMirror").evaluate((node) => {
    return [...node.children].map((child) => child.tagName.toLowerCase());
  });
}

async function main() {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), "lifeos-editor-smoke-"));
  const failures = [];
  let app = null;

  try {
    let app = await electron.launch({
      args: ["."],
      cwd: projectRoot,
      env: { ...process.env, LIFEOS_USER_DATA_DIR: userDataDir },
      timeout: 60000,
    });
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");

    step("create page");
    await window.getByRole("button", { name: "Create a page" }).click({ timeout: 20000 });
    const editor = window.locator(".page-doc-content .ProseMirror");
    await editor.waitFor({ state: "visible", timeout: 20000 });
    await editor.click();

    // FR-1.4: /h1 + Enter → Heading 1 created and focused.
    step("slash /h1");
    await typeLine(window, ["/h1"], ["Enter"]);
    await delay(200);
    if ((await editor.locator("> h1").count()) !== 1) {
      failures.push("/h1 + Enter did not create a Heading 1");
    }

    // FR-1.5: markdown shortcuts as-you-type.
    step("markdown block rules");
    await typeLine(window, ["# Judul markdown"], ["Enter", "Enter"]);
    await window.keyboard.press("Control+Alt+0"); // reset block to a paragraph
    await delay(150);
    await delay(600); // keep history groups apart for one-undo semantics
    if ((await editor.locator("> h1").filter({ hasText: "Judul markdown" }).count()) !== 1) {
      failures.push('# "…" did not convert into Heading 1');
    }
    await typeLine(window, ["- butir bullet"], ["Enter", "Enter"]);
    await window.keyboard.press("Control+Alt+0");
    await delay(150);
    await delay(600);
    if ((await editor.locator("> ul li").filter({ hasText: "butir bullet" }).count()) !== 1) {
      failures.push('- "…" did not convert into a bulleted list');
    }
    await typeLine(window, ["1. butir nomor"], ["Enter", "Enter"]);
    await window.keyboard.press("Control+Alt+0");
    await delay(150);
    await delay(600);
    if ((await editor.locator("> ol li").filter({ hasText: "butir nomor" }).count()) !== 1) {
      failures.push('1. "…" did not convert into an ordered list');
    }
    await typeLine(window, ["> kutipan"], ["Enter", "Enter"]);
    await window.keyboard.press("Control+Alt+0");
    await delay(150);
    await delay(600);
    if ((await editor.locator("> blockquote").filter({ hasText: "kutipan" }).count()) !== 1) {
      failures.push('> "…" did not convert into a quote');
    }
    await typeLine(window, ["[] tugas"], ["Enter"]);
    await window.keyboard.press("Control+Alt+0");
    await delay(150);
    await delay(600);
    const taskRegexSelector = "ul[data-type='taskList'] li";
    if ((await editor.locator(taskRegexSelector).filter({ hasText: "tugas" }).count()) !== 1) {
      failures.push("[] + space did not convert into a to-do item");
    }
    await typeLine(window, ["```"], [" "]);
    await delay(200);
    if ((await editor.locator("> pre").count()) !== 1) {
      failures.push("``` did not convert into a code block");
    }
    // Leave the code block; Ctrl+Enter exits it in Tiptap.
    await window.keyboard.press("Control+Enter");
    await delay(200);

    step("markdown divider");
    await typeLine(window, ["---"]);
    await delay(200);
    if ((await editor.locator("> hr").count()) !== 1) {
      failures.push("--- did not insert a divider");
    }

    step("markdown inline rules");
    await typeLine(window, ["tebal ", "**teks tebal**"], ["Enter"]);
    await delay(200);
    if ((await editor.locator("strong").filter({ hasText: "teks tebal" }).count()) !== 1) {
      failures.push("**…** did not convert into bold text");
    }
    await typeLine(window, ["mono ", "`teks mono`"]);
    await delay(200);
    if ((await editor.locator("code").filter({ hasText: "teks mono" }).count()) !== 1) {
      failures.push("`…` did not convert into inline code");
    }

    // FR-1.5: a single undo reverses the conversion that just happened.
    step("undo markdown");
    await window.keyboard.press("Control+z");
    await delay(150);
    if ((await editor.locator("code").filter({ hasText: "teks mono" }).count()) !== 0) {
      failures.push("one undo did not revert the inline code conversion");
    }

    // F1 acceptance: nested list + Shift+Tab outdent.
    step("nested list outdent");
    await editor.locator("> p").last().click();
    await typeLine(window, ["- induk"], ["Enter"]);
    await window.keyboard.press("Tab");
    await delay(120);
    await typeLine(window, ["anak"]);
    const nested = editor.locator("ul ul li").filter({ hasText: "anak" });
    if ((await nested.count()) !== 1) {
      failures.push("Tab did not nest the list item");
    }
    await window.keyboard.press("Shift+Tab");
    await delay(150);
    if ((await nested.count()) === 0) {
      const outdented = await editor.locator("> ul > li").filter({ hasText: "anak" }).count();
      if (outdented !== 1) {
        failures.push("Shift+Tab did not outdent the nested item");
      }
    }

    // FR-1.10: repeated undo walks the page back step by step.
    step("deep undo");
    let sawOneParagraph = false;
    for (let press = 0; press < 90; press += 1) {
      await window.keyboard.press("Control+z");
      await delay(60);
      const shapes = await docShape(window);
      if (shapes.length === 1 && shapes[0] === "p") {
        sawOneParagraph = true;
        break;
      }
    }
    if (!sawOneParagraph) {
      failures.push("repeated undo did not walk the page back to one empty paragraph");
    }

    step("close");
    await delay(1700); // let the hard flush settle before quitting
    await app.close();
    app = null;
  } catch (error) {
    failures.push(
      `unexpected error: ${String(error?.message ?? error)
        .split("\n")
        .map((line) => line.trim())
        .slice(0, 6)
        .join(" | ")}`,
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
    console.error("editor-smoke e2e: FAILED");
    process.exitCode = 1;
  } else {
    console.log("editor-smoke e2e: ALL PASS");
  }
}

await main();
