import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { openDatabase } from "../dist-electron/electron/database/index.js";
import { runMigrations } from "../dist-electron/electron/database/migrations.js";
import { uuidv7 } from "../dist-electron/electron/database/uuid.js";
import {
  isCreatePageArgs,
  isMovePageArgs,
  isPageIdArgs,
  isRenamePageArgs,
  isSavePageContentArgs,
} from "../dist-electron/electron/ipc-contract.js";
import { PageRepository, PageRepositoryError } from "../dist-electron/electron/pages/repository.js";

async function withRepository(run) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "lifeos-pages-"));
  let connection;

  try {
    connection = await openDatabase(directory);
    const device = connection.sqlite
      .prepare("SELECT id FROM devices LIMIT 1")
      .get();
    const repository = new PageRepository(
      connection.db,
      connection.sqlite,
      device.id,
    );
    await run({ repository, connection });
  } finally {
    connection?.sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

test("creates pages with defaults and returns a nested active tree", async () => {
  await withRepository(({ repository, connection }) => {
    const parent = repository.createPage();
    const firstChild = repository.createPage({ parentId: parent.id });
    const secondChild = repository.createPage({ parentId: parent.id });
    const tree = repository.listTree();

    assert.equal(parent.title, "Untitled");
    assert.equal(parent.parentId, null);
    assert.equal(parent.contentJson, '{"type":"doc","content":[{"type":"paragraph"}]}');
    assert.equal(tree.length, 1);
    assert.deepEqual(
      tree[0].children.map(({ id }) => id),
      [firstChild.id, secondChild.id],
    );
    assert.equal(
      connection.sqlite.prepare("SELECT COUNT(*) AS count FROM change_log").get().count,
      3,
    );
  });
});

test("renames pages after trimming whitespace and rejects an empty title", async () => {
  await withRepository(({ repository }) => {
    const page = repository.createPage();

    assert.equal(repository.renamePage(page.id, "  Project notes  ").title, "Project notes");
    assert.throws(
      () => repository.renamePage(page.id, " \t "),
      (error) =>
        error instanceof PageRepositoryError && error.code === "INVALID_INPUT",
    );
    assert.equal(repository.listTree()[0].title, "Project notes");
  });
});

test("moves pages by fractional position and rejects descendant cycles", async () => {
  await withRepository(({ repository, connection }) => {
    const source = repository.createPage();
    const destination = repository.createPage();
    const anchor = repository.createPage();
    const before = repository.createPage({ parentId: destination.id });
    const after = repository.createPage({ parentId: destination.id });

    repository.movePage(source.id, { parentId: destination.id, beforeId: after.id });
    repository.movePage(anchor.id, { parentId: destination.id, afterId: before.id });

    const destinationNode = repository.listTree().find(({ id }) => id === destination.id);
    assert.deepEqual(
      destinationNode.children.map(({ id }) => id),
      [before.id, anchor.id, source.id, after.id],
    );

    const movedSource = destinationNode.children.find(({ id }) => id === source.id);
    assert.match(movedSource.position, /^[0-9a-f]{16}$/);
    assert.throws(
      () => repository.movePage(destination.id, { parentId: source.id }),
      (error) =>
        error instanceof PageRepositoryError && error.code === "CYCLE",
    );
    const rebalancedPage = repository.createPage();
    connection.sqlite
      .prepare("UPDATE pages SET position = ? WHERE id = ?")
      .run("0000000000000001", before.id);
    connection.sqlite
      .prepare("UPDATE pages SET position = ? WHERE id = ?")
      .run("0000000000000002", anchor.id);
    repository.movePage(rebalancedPage.id, {
      parentId: destination.id,
      beforeId: anchor.id,
    });
    assert.deepEqual(
      repository
        .listTree()
        .find(({ id }) => id === destination.id)
        .children.map(({ id }) => id),
      [before.id, rebalancedPage.id, anchor.id, source.id, after.id],
    );
    assert.equal(
      connection.sqlite
        .prepare("SELECT parent_id FROM pages WHERE id = ?")
        .get(destination.id).parent_id,
      null,
    );
  });
});

test("rejects missing pages and invalid move anchors without changing the tree", async () => {
  await withRepository(({ repository }) => {
    const page = repository.createPage();
    const another = repository.createPage();
    const child = repository.createPage({ parentId: another.id });

    assert.throws(
      () => repository.renamePage("00000000-0000-7000-8000-000000000000", "Missing"),
      (error) =>
        error instanceof PageRepositoryError && error.code === "NOT_FOUND",
    );
    assert.throws(
      () =>
        repository.movePage(page.id, {
          parentId: null,
          beforeId: child.id,
        }),
      (error) =>
        error instanceof PageRepositoryError && error.code === "INVALID_INPUT",
    );
    assert.equal(repository.listTree().length, 2);
  });
});

test("deletes and restores an entire subtree without losing sibling order", async () => {
  await withRepository(({ repository }) => {
    const before = repository.createPage();
    const parent = repository.createPage();
    const child = repository.createPage({ parentId: parent.id });
    const grandchild = repository.createPage({ parentId: child.id });
    const after = repository.createPage();

    repository.deletePage(parent.id);

    assert.deepEqual(repository.listTree().map(({ id }) => id), [before.id, after.id]);
    assert.deepEqual(repository.listTrash().map(({ id }) => id), [parent.id]);

    repository.restorePage(parent.id);

    assert.deepEqual(repository.listTree().map(({ id }) => id), [
      before.id,
      parent.id,
      after.id,
    ]);
    assert.deepEqual(
      repository.listTree()[1].children[0].children.map(({ id }) => id),
      [grandchild.id],
    );
    assert.deepEqual(repository.listTrash(), []);
  });
});

test("restores a page at the root when its original parent is still deleted", async () => {
  await withRepository(({ repository }) => {
    const existingRoot = repository.createPage();
    const parent = repository.createPage();
    repository.movePage(existingRoot.id, {
      parentId: null,
      afterId: parent.id,
    });
    const child = repository.createPage({ parentId: parent.id });
    repository.deletePage(parent.id);

    repository.restorePage(child.id);

    assert.deepEqual(repository.listTree().map(({ id }) => id), [
      existingRoot.id,
      child.id,
    ]);
    assert.deepEqual(repository.listTrash().map(({ id }) => id), [parent.id]);
  });
});

test("reads and saves page content with validation", async () => {
  await withRepository(({ repository }) => {
    const page = repository.createPage();
    const content = repository.getContent(page.id);
    assert.equal(content.pageId, page.id);
    // The default document has no block ids, so the first load migrates it
    // to document schema version 2 (FR-1.1).
    assert.equal(content.schemaVersion, 2);
    assert.equal(JSON.parse(content.contentJson).type, "doc");

    const document = {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
    const updated = repository.saveContent(page.id, {
      contentJson: JSON.stringify(document),
    });
    assert.equal(updated.updatedAt > content.updatedAt, true);
    // The saved document was id-less, so the save normalized it and the
    // re-read carries the assigned stable block id (FR-1.1).
    const reread = JSON.parse(repository.getContent(page.id).contentJson);
    assert.equal(reread.content[0].type, "paragraph");
    assert.equal(typeof reread.content[0].attrs.id, "string");

    assert.throws(
      () => repository.saveContent(page.id, { contentJson: "" }),
      (error) =>
        error instanceof PageRepositoryError && error.code === "INVALID_INPUT",
    );
    assert.throws(
      () =>
        repository.saveContent(page.id, {
          contentJson: JSON.stringify({ type: "doc", content: [] }),
        }),
      (error) =>
        error instanceof PageRepositoryError && error.code === "INVALID_INPUT",
    );
    assert.throws(
      () => repository.saveContent(page.id, { contentJson: "not-json" }),
      (error) =>
        error instanceof PageRepositoryError && error.code === "INVALID_INPUT",
    );
    assert.throws(
      () => repository.getContent(uuidv7()),
      (error) =>
        error instanceof PageRepositoryError && error.code === "NOT_FOUND",
    );

    repository.deletePage(page.id);
    assert.throws(
      () => repository.getContent(page.id),
      (error) =>
        error instanceof PageRepositoryError && error.code === "NOT_FOUND",
    );
  });
});

test("purges a trash subtree permanently and keeps other pages intact", async () => {
  await withRepository(({ repository, connection }) => {
    const surviving = repository.createPage();
    const parent = repository.createPage();
    const child = repository.createPage({ parentId: parent.id });
    const grandchild = repository.createPage({ parentId: child.id });

    repository.deletePage(parent.id);
    repository.purgePage(parent.id);

    assert.deepEqual(repository.listTree().map(({ id }) => id), [surviving.id]);
    assert.deepEqual(repository.listTrash(), []);

    const remainingPages = connection.sqlite
      .prepare("SELECT id FROM pages")
      .all()
      .map(({ id }) => id);
    assert.deepEqual(remainingPages, [surviving.id]);

    // Every purged row produced one terminal change-log entry.
    const purgeEvents = connection.sqlite
      .prepare("SELECT entity_id FROM change_log WHERE operation = 'purge'")
      .all()
      .map(({ entity_id }) => entity_id);
    assert.deepEqual(purgeEvents.sort(), [child.id, grandchild.id, parent.id].sort());

    // The purged page no longer resolves anywhere.
    assert.throws(
      () => repository.restorePage(parent.id),
      (error) =>
        error instanceof PageRepositoryError && error.code === "NOT_FOUND",
    );
  });
});

test("rejects purging an active page and purging an unknown page", async () => {
  await withRepository(({ repository }) => {
    const page = repository.createPage();

    assert.throws(
      () => repository.purgePage(page.id),
      (error) =>
        error instanceof PageRepositoryError && error.code === "INVALID_INPUT",
    );
    assert.throws(
      () => repository.purgePage(uuidv7()),
      (error) =>
        error instanceof PageRepositoryError && error.code === "NOT_FOUND",
    );
    assert.equal(repository.listTree().length, 1);
  });
});

test("auto-purge removes only trash entries past the retention window", async () => {
  await withRepository(({ repository, connection }) => {
    const surviving = repository.createPage();
    const keeper = repository.createPage();
    const expired = repository.createPage();
    repository.deletePage(keeper.id);
    repository.deletePage(expired.id);
    // Age only the expired entry's tombstone past the 30-day window.
    connection.sqlite
      .prepare("UPDATE pages SET deleted_at = ? WHERE id = ?")
      .run(new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString(), expired.id);

    const purged = repository.purgeExpiredTrash(Date.now(), 30);

    assert.equal(purged, 1);
    assert.deepEqual(
      repository.listTrash().map(({ id }) => id),
      [keeper.id],
    );
    assert.deepEqual(
      repository.listTree().map(({ id }) => id),
      // The keeper stays a tombstone; only the expired entry is purged.
      [surviving.id],
    );
  });
});

test("version 2 migration preserves change_log entries and allows the purge operation", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "lifeos-migrations-"));
  const db = new Database(path.join(directory, "lifeos.sqlite"));
  try {
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE change_log (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        device_id TEXT NOT NULL REFERENCES devices(id),
        entity_type TEXT NOT NULL CHECK (entity_type = 'page'),
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL
          CHECK (operation IN ('create', 'update', 'move', 'delete', 'restore')),
        payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
        created_at TEXT NOT NULL
      );
      INSERT INTO devices (id, name, created_at, updated_at) VALUES ('device-1', 'Test', '2026-01-01', '2026-01-01');
      INSERT INTO change_log (id, device_id, entity_type, entity_id, operation, payload_json, created_at)
        VALUES ('entry-1', 'device-1', 'page', 'page-1', 'create', '{}', '2026-01-01');
      PRAGMA user_version = 1;
    `);
    // Version 1 rejects the purge operation outright.
    assert.throws(() =>
      db
        .prepare(
          "INSERT INTO change_log (id, device_id, entity_type, entity_id, operation, payload_json, created_at) VALUES ('purge-v1', 'device-1', 'page', 'page-1', 'purge', '{}', '2026-01-02')",
        )
        .run());

    const backupPath = await runMigrations(db, directory);

    // The pre-migration backup exists and the old entry survived the rebuild.
    assert.ok(backupPath);
    assert.equal(
      db
        .prepare(
          "SELECT operation FROM change_log WHERE id = 'entry-1'",
        )
        .get().operation,
      "create",
    );
    // Version 2 accepts it.
    db.prepare(
      "INSERT INTO change_log (id, device_id, entity_type, entity_id, operation, payload_json, created_at) VALUES ('purge-v2', 'device-1', 'page', 'page-1', 'purge', '{}', '2026-01-02')",
    ).run();
    assert.equal(
      db.prepare("SELECT COUNT(*) AS count FROM change_log").get().count,
      2,
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("version 3 migration adds the nullable cover column and keeps existing rows", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "lifeos-migrations-v3-"));
  const db = new Database(path.join(directory, "lifeos.sqlite"));
  try {
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE pages (
        id TEXT PRIMARY KEY,
        parent_id TEXT REFERENCES pages(id) ON DELETE SET NULL,
        title TEXT NOT NULL DEFAULT 'Untitled',
        icon TEXT,
        position TEXT NOT NULL,
        is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
        content_json TEXT NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'
          CHECK (json_valid(content_json)),
        schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      INSERT INTO devices (id, name, created_at, updated_at) VALUES ('device-1', 'Test', '2026-01-01', '2026-01-01');
      INSERT INTO pages (id, title, position, created_at, updated_at)
        VALUES ('page-1', 'Kept', '8000000000000000', '2026-01-01', '2026-01-01');
      PRAGMA user_version = 2;
    `);

    const backupPath = await runMigrations(db, directory);

    // The pre-migration backup exists (FR-3.4).
    assert.ok(backupPath);
    assert.ok(existsSync(backupPath));
    const backup = new Database(backupPath, { readonly: true });
    try {
      assert.equal(backup.pragma("user_version", { simple: true }), 2);
      assert.equal(
        backup
          .prepare("SELECT COUNT(*) AS count FROM pragma_table_info('pages') WHERE name = 'cover'")
          .get().count,
        0,
      );
    } finally {
      backup.close();
    }

    // The column exists in place, is nullable, and the row survived.
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS count FROM pragma_table_info('pages') WHERE name = 'cover'")
        .get().count,
      1,
    );
    const kept = db
      .prepare("SELECT title, cover FROM pages WHERE id = 'page-1'")
      .get();
    assert.equal(kept.title, "Kept");
    assert.equal(kept.cover, null);

    // The new column accepts values.
    db.prepare("UPDATE pages SET cover = 'bg.png' WHERE id = 'page-1'").run();
    assert.equal(
      db.prepare("SELECT cover FROM pages WHERE id = 'page-1'").get().cover,
      "bg.png",
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("page loads assign stable unique ids to top-level blocks missing them", async () => {
  await withRepository(({ repository, connection }) => {
    const page = repository.createPage();
    // A stored document written "before" block ids existed.
    const legacyDocument = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "one" }] },
        { type: "heading", attrs: { level: 1 }, content: [] },
        { type: "horizontalRule" },
      ],
    };
    connection.sqlite
      .prepare("UPDATE pages SET content_json = ?, schema_version = 1 WHERE id = ?")
      .run(JSON.stringify(legacyDocument), page.id);

    const loaded = repository.getContent(page.id);
    assert.equal(loaded.schemaVersion, 2);
    const loadedDoc = JSON.parse(loaded.contentJson);
    const ids = loadedDoc.content.map((node) => node.attrs.id);
    assert.equal(ids.length, 3);
    assert.ok(ids.every((id) => typeof id === "string" && id.length > 0));
    assert.equal(new Set(ids).size, ids.length, "ids are unique");
    // Other attributes survive the normalization.
    assert.equal(loadedDoc.content[1].attrs.level, 1);

    // The migration itself is a logged write.
    assert.equal(
      connection.sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM change_log WHERE entity_id = ? AND operation = 'update'",
        )
        .get(page.id).count,
      1,
    );

    // Reloading the page keeps the same ids (stable) and stops rewriting.
    const reloaded = repository.getContent(page.id);
    const reloadedIds = JSON.parse(reloaded.contentJson).content.map(
      (node) => node.attrs.id,
    );
    assert.deepEqual(reloadedIds, ids);

    // Editor saves without ids are normalized too and bump the version.
    const saved = repository.saveContent(page.id, {
      contentJson: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph" }],
      }),
    });
    assert.equal(saved.schemaVersion, 2);
    const savedDoc = JSON.parse(
      repository.getContent(page.id).contentJson,
    );
    assert.equal(typeof savedDoc.content[0].attrs.id, "string");
    assert.equal(repository.getContent(page.id).schemaVersion, 2);
  });
});

test("validates every page IPC input shape and rejects extra or malformed fields", () => {
  const pageId = uuidv7();
  const parentId = uuidv7();

  assert.equal(isCreatePageArgs([{}]), true);
  assert.equal(isCreatePageArgs([{ parentId, title: "Notes" }]), true);
  assert.equal(isCreatePageArgs([{ parentId: "not-an-id" }]), false);
  assert.equal(isCreatePageArgs([{ unexpected: true }]), false);

  assert.equal(isRenamePageArgs([{ pageId, title: " Notes " }]), true);
  assert.equal(isRenamePageArgs([{ pageId, title: " " }]), false);
  assert.equal(isRenamePageArgs([{ pageId, title: "Note", isFavorite: true }]), false);

  assert.equal(isMovePageArgs([{ pageId, parentId, beforeId: uuidv7() }]), true);
  assert.equal(
    isMovePageArgs([{ pageId, parentId, beforeId: uuidv7(), afterId: uuidv7() }]),
    false,
  );
  assert.equal(isMovePageArgs([{ pageId, parentId, beforeId: pageId }]), false);
  assert.equal(isMovePageArgs([{ pageId: "bad", parentId: null }]), false);

  assert.equal(isPageIdArgs([{ pageId }]), true);
  assert.equal(isPageIdArgs([{ pageId, extra: "rejected" }]), false);

  assert.equal(isSavePageContentArgs([{ pageId, contentJson: '{"type":"doc"}' }]), true);
  assert.equal(isSavePageContentArgs([{ pageId, contentJson: "" }]), false);
  assert.equal(isSavePageContentArgs([{ pageId, contentJson: 42 }]), false);
  assert.equal(
    isSavePageContentArgs([{ pageId, contentJson: "x".repeat(5 * 1024 * 1024) }]),
    false,
  );
});
