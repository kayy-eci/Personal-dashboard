import test from "node:test";
import assert from "node:assert/strict";
import { collectReferencedHashes, isCleanupDue, listOrphanFileNames } from "../dist-electron/electron/attachments/cleanup.js";

test("collectReferencedHashes extracts every attachment hash used by page JSON", () => {
  const rows = [
    JSON.stringify({
      attrs: { src: "lifeos://app/attachment/" + "a".repeat(64) + ".png" },
    }),
    "text with reference /attachment/" + "b".repeat(64) + ".jpeg keep",
    "no references here",
    JSON.stringify({
      src: "lifeos://app/attachment/" + "a".repeat(64) + ".png",
    }),
  ];

  const hashes = collectReferencedHashes(rows);
  assert.deepEqual([...hashes].sort(), [Array(64).fill("a").join(""), Array(64).fill("b").join("")]);
});

test("listOrphanFileNames keeps referenced files and ignores non-attachment files", () => {
  const hashA = Array(64).fill("a").join("");
  const hashB = Array(64).fill("b").join("");
  const files = [
    `${hashA}.png`,
    `${hashB}.webp`,
    "does-not-match-the-pattern.txt",
    "too-short.png",
  ];

  const orphans = listOrphanFileNames(files, new Set([hashA]));
  assert.deepEqual(orphans, [`${hashB}.webp`]);
});

test("isCleanupDue runs the first time and then at most once per interval", () => {
  const now = 1_700_000_000_000;
  assert.equal(isCleanupDue({ lastRun: null }, now), true);
  assert.equal(isCleanupDue({ lastRun: now - 6 * 24 * 60 * 60 * 1000 }, now), false);
  assert.equal(isCleanupDue({ lastRun: now - 7 * 24 * 60 * 60 * 1000 }, now), true);
});
test("collectReferencedHashes also keeps page header icon and cover images", () => {
  const hashA = Array(64).fill("a").join("");
  const hashB = Array(64).fill("b").join("");
  const rows = [
    JSON.stringify({ type: "doc", content: [] }) + " image:" + hashA + ".png",
    "image:" + hashB + ".webp",
  ];
  const hashes = collectReferencedHashes(rows);
  assert.ok(hashes.has(hashA));
  assert.ok(hashes.has(hashB));
});

test("GIF references are treated like any other attachment by cleanup", () => {
  const contentGif = Array(64).fill("c").join("");
  const headerGif = Array(64).fill("d").join("");
  const orphanGif = Array(64).fill("e").join("");
  const rows = [
    JSON.stringify({
      attrs: { src: `lifeos://app/attachment/${contentGif}.gif` },
    }),
    `image:${headerGif}.gif`,
  ];
  const hashes = collectReferencedHashes(rows);
  assert.ok(hashes.has(contentGif));
  assert.ok(hashes.has(headerGif));
  assert.deepEqual(
    listOrphanFileNames(
      [`${contentGif}.gif`, `${headerGif}.gif`, `${orphanGif}.gif`],
      hashes,
    ),
    [`${orphanGif}.gif`],
  );
});
