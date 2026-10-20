/**
 * FR-2.14 page header layout e2e (Playwright _electron).
 *
 * The cover is full-bleed across the main pane at clamp(180px, 30vh, 400px);
 * the 78 px icon overlaps the cover's bottom edge by half and aligns with the
 * title column; the title sits 72 px below the cover when an icon is present,
 * 40 px when only a cover is present, and 24 px from the pane top otherwise.
 *
 * Usage: node tests/page-header.e2e.mjs (requires `npm run build` output).
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { _electron as electron } from "playwright";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const animatedGif = readFileSync(
  path.join(projectRoot, "tests/fixtures/animated.gif"),
);
const animatedGifHash = createHash("sha256")
  .update(animatedGif)
  .digest("hex");

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function step(name) {
  console.log(`[step] ${name}`);
}

function near(actual, expected, tolerance = 1.5) {
  return Math.abs(actual - expected) <= tolerance;
}

async function main() {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), "lifeos-page-header-"));
  const failures = [];
  let app = null;

  const check = (condition, message) => {
    if (!condition) {
      failures.push(message);
    }
  };

  try {
    app = await electron.launch({
      args: ["."],
      cwd: projectRoot,
      env: { ...process.env, LIFEOS_USER_DATA_DIR: userDataDir },
      timeout: 60000,
    });
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setSize(1280, 900);
    });
    await window.getByRole("button", { name: "Create a page" }).click({ timeout: 20000 });
    const header = window.locator(".page-header");
    await header.waitFor({ state: "visible", timeout: 20000 });

    const box = async (selector) => window.locator(selector).first().boundingBox();
    const viewportHeight = () => window.evaluate(() => window.innerHeight);

    const measure = async () => {
      const pane = await box(".page-view");
      const cover = (await window.locator(".page-cover").count()) > 0 ? await box(".page-cover") : null;
      const icon = (await window.locator(".page-header-icon").count()) > 0 ? await box(".page-header-icon") : null;
      const title = await box(".page-title-row");
      return { pane, cover, icon, title };
    };

    step("no cover, no icon: title 24 px from the pane top");
    {
      const { pane, cover, icon, title } = await measure();
      check(pane !== null, "main pane is missing");
      check(cover === null, "cover should be absent");
      check(icon === null, "icon should be absent");
      check(title !== null && near(title.y - pane.y, 24), "title is not 24 px from the pane top");
    }

    step("add a color cover: full-bleed, 30vh high, title 40 px below");
    await window.getByRole("button", { name: "Add cover" }).click();
    check(
      (await window.locator(".page-header-cover-preset").count()) > 0,
      "cover menu did not open",
    );
    await window.locator(".page-header-cover-preset").nth(1).click();
    await delay(400);
    {
      const { pane, cover, icon, title } = await measure();
      const expectedHeight = Math.min(400, Math.max(180, (await viewportHeight()) * 0.3));
      check(cover !== null, "cover did not render");
      if (cover && pane) {
        check(near(cover.x, pane.x), "cover does not start at the main pane's left edge");
        check(near(cover.width, pane.width), "cover does not span the main pane's width");
        check(near(cover.y, pane.y), "cover does not start at the main pane's top edge");
        check(
          near(cover.height, expectedHeight),
          `cover height ${cover.height} is not clamp(180px, 30vh, 400px) = ${expectedHeight}`,
        );
        check(
          title !== null && near(title.y - (cover.y + cover.height), 40),
          "title is not 40 px below the cover bottom without an icon",
        );
      }
      check(icon === null, "icon should be absent");
    }

    step("add an emoji icon: 78 px, half-overlapping the cover, title 72 px below");
    await window.getByRole("button", { name: "Add icon" }).click();
    await window.locator(".page-header-emoji-button").first().click();
    await delay(400);
    {
      const { cover, icon, title } = await measure();
      check(icon !== null && near(icon.width, 78), "icon is not 78 px wide");
      check(icon !== null && near(icon.height, 78), "icon is not 78 px tall");
      if (icon && cover) {
        check(
          near(icon.y + icon.height - (cover.y + cover.height), 39),
          "icon does not overlap the cover's bottom edge by half",
        );
        check(near(icon.x, title.x), "icon is not left-aligned with the title column");
        check(
          title !== null && near(title.y - (cover.y + cover.height), 72),
          "title is not 72 px below the cover bottom with an icon",
        );
      }
    }

    step("cover toolbar sits 12 px from the cover's top-right");
    {
      const cover = await box(".page-cover");
      const toolbar = await box(".page-cover-toolbar");
      check(
        toolbar !== null && near(toolbar.y, cover.y + 12),
        "cover toolbar is not 12 px from the cover top",
      );
      check(
        toolbar !== null && near(toolbar.x + toolbar.width, cover.x + cover.width - 12),
        "cover toolbar is not 12 px from the cover right edge",
      );
      const hiddenOpacity = await window
        .locator(".page-cover-toolbar")
        .evaluate((node) => getComputedStyle(node).opacity);
      check(Number(hiddenOpacity) < 0.05, "cover toolbar should be hidden without hover/focus");
      await window.getByRole("button", { name: "Change cover" }).focus();
      await delay(300);
      const focusedOpacity = await window
        .locator(".page-cover-toolbar")
        .evaluate((node) => getComputedStyle(node).opacity);
      check(Number(focusedOpacity) > 0.95, "cover toolbar is not visible when keyboard focused");
    }

    step("remove the icon: title 40 px below the cover");
    await window.getByRole("button", { name: "Change page icon" }).click();
    await window.getByRole("button", { name: "Remove", exact: true }).click();
    await delay(400);
    {
      const { cover, icon, title } = await measure();
      check(icon === null, "icon was not removed");
      check(
        cover !== null && title !== null && near(title.y - (cover.y + cover.height), 40),
        "title is not 40 px below the cover after removing the icon",
      );
    }

    step("remove the cover: title back to 24 px from the pane top");
    await window.getByRole("button", { name: "Change cover" }).click();
    await window.getByRole("button", { name: "Remove cover" }).click();
    await delay(400);
    {
      const { pane, cover, title } = await measure();
      check(cover === null, "cover was not removed");
      check(
        title !== null && near(title.y - pane.y, 24),
        "title is not 24 px from the pane top after removing the cover",
      );
    }

    step("800 px window: cover keeps the 180 px minimum");
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setSize(800, 600);
    });
    await delay(400);
    await window.getByRole("button", { name: "Add cover" }).click();
    await window.locator(".page-header-cover-preset").nth(2).click();
    await delay(400);
    {
      const { pane, cover } = await measure();
      check(cover !== null, "cover did not render in the narrow window");
      if (cover && pane) {
        check(near(cover.width, pane.width), "cover does not fill the narrow pane");
        check(near(cover.height, 180), "cover is not at the 180 px minimum height");
      }
    }

    step("GIF cover: served as image/gif with the original animated bytes");
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setSize(1280, 900);
    });
    await delay(400);
    await window.getByRole("button", { name: "Change cover" }).click();
    await window
      .locator(".page-header-cover-menu input[type=file]")
      .setInputFiles({
        name: "animated.gif",
        mimeType: "image/gif",
        buffer: animatedGif,
      });
    await window.locator(".page-cover-image").waitFor({ timeout: 10000 });
    {
      const src = await window.locator(".page-cover-image").getAttribute("src");
      check(
        src === `/attachment/${animatedGifHash}.gif`,
        `GIF cover src should be the content-addressed .gif, got ${src}`,
      );
      const fetched = await window.evaluate(async (url) => {
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hash = [...new Uint8Array(digest)]
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        return {
          contentType: response.headers.get("content-type"),
          hash,
          size: bytes.byteLength,
        };
      }, src);
      check(fetched.contentType === "image/gif", "GIF cover is not served as image/gif");
      check(fetched.hash === animatedGifHash, "GIF cover bytes were re-encoded");
      check(fetched.size === animatedGif.length, "GIF cover size changed");
      const decoded = await window.locator(".page-cover-image").evaluate((img) => ({
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));
      check(
        decoded.complete && decoded.naturalWidth === 16 && decoded.naturalHeight === 16,
        "GIF cover did not decode in Chromium",
      );
      const firstFrame = await window.locator(".page-cover").screenshot();
      await delay(620);
      const secondFrame = await window.locator(".page-cover").screenshot();
      check(
        !firstFrame.equals(secondFrame),
        "GIF cover is not animating after it is displayed",
      );
    }

    step("GIF icon: accepted by the picker and stored as .gif");
    await window.getByRole("button", { name: "Add icon" }).click();
    await window.getByRole("button", { name: "Upload" }).click();
    await window
      .getByRole("dialog", { name: "Choose icon" })
      .locator("input[type=file]")
      .setInputFiles({
        name: "animated.gif",
        mimeType: "image/gif",
        buffer: animatedGif,
      });
    await window.locator(".page-header-icon-image img").waitFor({ timeout: 10000 });
    {
      const src = await window
        .locator(".page-header-icon-image img")
        .getAttribute("src");
      check(
        src === `/attachment/${animatedGifHash}.gif`,
        `GIF icon src should be the content-addressed .gif, got ${src}`,
      );
      const fetched = await window.evaluate(async (url) => {
        const response = await fetch(url);
        return response.headers.get("content-type");
      }, src);
      check(fetched === "image/gif", "GIF icon is not served as image/gif");
    }

    step("GIF paste in the editor: image block keeps the .gif bytes");
    {
      const editor = window.locator(".page-doc-content .ProseMirror");
      await editor.click();
      await editor.evaluate((node, base64) => {
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        const file = new File([bytes], "pasted.gif", { type: "image/gif" });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        node.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: transfer,
            bubbles: true,
            cancelable: true,
          }),
        );
      }, animatedGif.toString("base64"));
      const pasted = editor.locator(`img[src="/attachment/${animatedGifHash}.gif"]`);
      await pasted.waitFor({ timeout: 10000 });
      check((await pasted.count()) === 1, "pasted GIF did not become an image block");
    }
  } finally {
    if (app) {
      await app.close().catch(() => {});
    }
    rmSync(userDataDir, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error("\nPage header e2e failures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("\nPage header e2e passed.");
}

await main();


