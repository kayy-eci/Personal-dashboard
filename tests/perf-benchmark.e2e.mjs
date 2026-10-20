/**
 * Performance benchmark against the PRD NFRs, run on a SEEDED workspace
 * (5,000 nested pages). Produces a pass/fail table.
 *
 * Prereq: `npm run build` and a seeded workspace:
 *   node scripts/seed-workspace.mjs C:\\tmp\\lifeos-seed-5000
 *
 * Run:
 *   LIFEOS_USER_DATA_DIR=C:\\tmp\\lifeos-seed-5000 node tests/perf-benchmark.e2e.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { _electron as electron } from "playwright";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const userDataDir = process.env.LIFEOS_USER_DATA_DIR;
if (!userDataDir) {
  console.error("Set LIFEOS_USER_DATA_DIR to a seeded workspace directory.");
  process.exit(1);
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

const results = [];
function record(metric, measuredMs, limitMs) {
  results.push({ metric, measuredMs: Math.round(measuredMs), limitMs, pass: measuredMs <= limitMs });
}

let app = null;
try {
  const coldStart = performance.now();
  app = await electron.launch({
    args: ["."],
    cwd: projectRoot,
    env: { ...process.env, LIFEOS_USER_DATA_DIR: userDataDir },
    timeout: 120000,
  });
  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");
  const coldMs = performance.now() - coldStart;
  record("Cold start (launch → domcontentloaded)", coldMs, 2000);

  const sidebarStart = performance.now();
  await window.waitForFunction(
    () => document.querySelectorAll('[role="treeitem"]').length > 0,
    null,
    { timeout: 30000 },
  );
  record("Sidebar render (first page row visible)", performance.now() - sidebarStart, 2000);

  const pageLink = window.locator('[role="treeitem"]').first();
  await pageLink.waitFor({ state: "visible", timeout: 30000 });
  const openStart = performance.now();
  await pageLink.click();
  await window.locator(".page-doc-content .ProseMirror").waitFor({ state: "visible", timeout: 30000 });
  const openMs = performance.now() - openStart;
  record("Page open (click → editor visible)", openMs, 150);

  const pageId = await window.evaluate(async () => {
    const tree = await window.lifeos.listPageTree();
    const flatten = (nodes) => {
      const out = [];
      for (const node of nodes ?? []) {
        out.push(node.id);
        if (node.children) out.push(...flatten(node.children));
      }
      return out;
    };
    return flatten(tree)[0] ?? null;
  });

  const contentJson = JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "perf probe" }] }],
  });
  const saveStart = performance.now();
  await window.evaluate(
    async ({ id, json }) => {
      await window.lifeos.savePageContent({ pageId: id, contentJson: json });
    },
    { id: pageId, json: contentJson },
  );
  const saveMs = performance.now() - saveStart;
  record("Autosave write (IPC savePageContent round trip)", saveMs, 20);

  await delay(500);
  await app.close();
  app = null;
} catch (error) {
  console.error("benchmark error:", String(error?.message ?? error));
  try {
    await app?.close();
  } catch {
    // ignore
  }
  process.exitCode = 1;
}

console.log("");
console.log("| Metric | Measured (ms) | Limit (ms) | Result |");
console.log("|---|---:|---:|---|");
for (const row of results) {
  console.log(`| ${row.metric} | ${row.measuredMs} | ${row.limitMs} | ${row.pass ? "PASS" : "FAIL"} |`);
}
console.log("");
const failed = results.filter((row) => !row.pass);
console.log(`summary: ${results.length - failed.length}/${results.length} pass`);
if (failed.length > 0) {
  process.exitCode = 1;
}
