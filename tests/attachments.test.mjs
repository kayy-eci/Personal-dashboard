import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTACHMENT_MAX_BYTES,
  detectImageMime,
  getMimeForAttachmentFileName,
  saveAttachment,
} from "../dist-electron/electron/attachments/store.js";
import { isSaveAttachmentArgs } from "../dist-electron/electron/ipc-contract.js";

const fixturesDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);
const animatedGif = readFileSync(path.join(fixturesDirectory, "animated.gif"));
const hash = createHash("sha256").update(animatedGif).digest("hex");

function toArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

test("detectImageMime accepts a real GIF and rejects fake or SVG bytes", () => {
  assert.equal(detectImageMime(animatedGif), "image/gif");
  assert.equal(
    detectImageMime(
      Buffer.from("The header GIF89a is mentioned inside this text"),
    ),
    undefined,
  );
  assert.equal(
    detectImageMime(Buffer.from("this is a text file named picture.gif")),
    undefined,
  );
  assert.equal(
    detectImageMime(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script /></svg>'),
    ),
    undefined,
  );
});

test("detectImageMime reads PNG bytes even when the file is named .gif", () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from("renamed-from-gif", "ascii"),
  ]);
  assert.equal(detectImageMime(png), "image/png");
});

test("saveAttachment stores a GIF untouched under a .gif name", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "lifeos-attachment-store-"));
  try {
    const stored = await saveAttachment(directory, toArrayBuffer(animatedGif));
    assert.equal(stored.fileName, `${hash}.gif`);
    assert.equal(stored.urlPath, `/attachment/${hash}.gif`);
    assert.equal(getMimeForAttachmentFileName(stored.fileName), "image/gif");
    assert.deepEqual(readFileSync(path.join(directory, stored.fileName)), animatedGif);
    assert.deepEqual(readdirSync(directory), [`${hash}.gif`]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("saveAttachment rejects fake GIF bytes without writing a file", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "lifeos-attachment-store-"));
  try {
    await assert.rejects(
      saveAttachment(directory, toArrayBuffer(Buffer.from("not a gif"))),
      /format is not supported/i,
    );
    assert.deepEqual(readdirSync(directory), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("saveAttachment rejects oversized images with a clear message", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "lifeos-attachment-store-"));
  try {
    const oversized = Buffer.alloc(ATTACHMENT_MAX_BYTES + 1);
    animatedGif.copy(oversized, 0);
    await assert.rejects(
      saveAttachment(directory, toArrayBuffer(oversized)),
      /maximum size is 20 MB/i,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("isSaveAttachmentArgs accepts bytes only and rejects a declared mime", () => {
  const bytes = toArrayBuffer(animatedGif);
  assert.equal(isSaveAttachmentArgs([{ bytes }]), true);
  assert.equal(
    isSaveAttachmentArgs([{ mime: "image/gif", bytes }]),
    false,
  );
  assert.equal(isSaveAttachmentArgs([{ bytes: "not an ArrayBuffer" }]), false);
  assert.equal(
    isSaveAttachmentArgs([{ bytes: new ArrayBuffer(0) }]),
    false,
  );
});

test("the protocol content type for GIF attachments is image/gif", () => {
  assert.equal(getMimeForAttachmentFileName(`${hash}.gif`), "image/gif");
  assert.equal(getMimeForAttachmentFileName(`${hash}.png`), "image/png");
  assert.equal(getMimeForAttachmentFileName(`${hash}.jpeg`), "image/jpeg");
  assert.equal(getMimeForAttachmentFileName(`${hash}.svg`), undefined);
});
