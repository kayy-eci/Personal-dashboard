/**
 * Dev script: seed a workspace database with ~5,000 NESTED pages, each
 * carrying a small document. Used by the performance benchmark.
 *
 * Usage:
 *   node scripts/seed-workspace.mjs [targetUserDataDir] [--pages 5000]
 *
 * The target directory is created if missing; an existing lifeos.sqlite there
 * is removed first (this is a dev-only seeding tool).
 */
import { mkdirSync, rmSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
let targetDir = path.join(os.tmpdir(), "lifeos-seed-5000");
let pageCount = 5000;
for (let index = 0; index < args.length; index += 1) {
  const token = args[index];
  if (token === "--pages") {
    pageCount = Number(args[index + 1]);
    index += 1;
  } else if (token === "--dir") {
    targetDir = args[index + 1];
    index += 1;
  } else if (!token.startsWith("--")) {
    targetDir = token;
  }
}

import { pathToFileURL } from "node:url";

// ...
const { openDatabase } = await import(pathToFileURL(path.join(projectRoot, "dist-electron", "electron", "database", "index.js")).href);
const { PageRepository } = await import(pathToFileURL(path.join(projectRoot, "dist-electron", "electron", "pages", "repository.js")).href);
const schema = await import(pathToFileURL(path.join(projectRoot, "dist-electron", "electron", "database", "schema.js")).href);

mkdirSync(targetDir, { recursive: true });
const dbFile = path.join(targetDir, "lifeos.sqlite");
for (const suffix of ["", "-wal", "-shm"]) {
  const candidate = dbFile + suffix;
  if (existsSync(candidate)) {
    rmSync(candidate, { force: true });
  }
}

const connection = await openDatabase(targetDir);
const deviceRow = connection.db
  .select({ id: schema.devices.id })
  .from(schema.devices)
  .limit(1)
  .get();

const repository = new PageRepository(connection.db, connection.sqlite, deviceRow.id);

const contentJson = JSON.stringify({
  type: "doc",
  content: Array.from({ length: 5 }, (_, index) => ({
    type: "paragraph",
    content: [{ type: "text", text: `Paragraf ${index + 1} dari halaman seed.` }],
  })),
});

console.log(`seeding ${pageCount} nested pages into ${targetDir}`);
const startedAt = Date.now();

const roots = Math.ceil(Math.cbrt(pageCount));
let created = 0;
const createOne = (title, parentId) => {
  const page = repository.createPage({ title, parentId });
  repository.saveContent(page.id, { contentJson });
  created += 1;
  if (created % 500 === 0) {
    console.log(`  ${created}/${pageCount}`);
  }
};

for (let rootIndex = 0; rootIndex < roots && created < pageCount; rootIndex += 1) {
  const root = repository.createPage({ title: `Root ${rootIndex + 1}` });
  repository.saveContent(root.id, { contentJson });
  created += 1;
  const childrenPerRoot = Math.ceil((pageCount - created) / Math.max(1, roots - rootIndex));
  const childCount = Math.min(childrenPerRoot, Math.ceil(Math.sqrt(pageCount)));
  for (let childIndex = 0; childIndex < childCount && created < pageCount; childIndex += 1) {
    const child = repository.createPage({
      title: `Child ${rootIndex + 1}.${childIndex + 1}`,
      parentId: root.id,
    });
    repository.saveContent(child.id, { contentJson });
    created += 1;
    const grandCount = Math.min(
      Math.ceil((pageCount - created) / Math.max(1, childCount - childIndex)),
      Math.ceil(Math.sqrt(pageCount)),
    );
    for (let grandIndex = 0; grandIndex < grandCount && created < pageCount; grandIndex += 1) {
      const grand = repository.createPage({
        title: `Grand ${rootIndex + 1}.${childIndex + 1}.${grandIndex + 1}`,
        parentId: child.id,
      });
      repository.saveContent(grand.id, { contentJson });
      created += 1;
    }
  }
}

connection.sqlite.close();
console.log(`seeded ${created} pages in ${Date.now() - startedAt} ms`);
console.log(`database: ${dbFile}`);
