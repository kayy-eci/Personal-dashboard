import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { openDatabase } from "../dist-electron/electron/database/index.js";
import { devices } from "../dist-electron/electron/database/schema.js";
import { uuidv7 } from "../dist-electron/electron/database/uuid.js";

function createTemporaryDirectory() {
  return mkdtempSync(path.join(os.tmpdir(), "lifeos-database-"));
}

test("initializes a WAL database with a local device and pre-migration backup", async () => {
  const directory = createTemporaryDirectory();
  let connection;

  try {
    connection = await openDatabase(directory);

    assert.equal(connection.sqlite.pragma("journal_mode", { simple: true }), "wal");
    assert.equal(connection.sqlite.pragma("foreign_keys", { simple: true }), 1);
    assert.equal(connection.sqlite.pragma("user_version", { simple: true }), 2);

    const [device] = connection.db.select().from(devices).all();
    assert.ok(device);
    assert.match(device.id, /^[0-9a-f-]{36}$/);
    assert.equal(device.name, "This device");
    assert.deepEqual(
      connection.sqlite
        .prepare("PRAGMA table_info(pages)")
        .all()
        .map((column) => column.name),
      [
        "id",
        "parent_id",
        "title",
        "icon",
        "position",
        "is_favorite",
        "content_json",
        "schema_version",
        "created_at",
        "updated_at",
        "deleted_at",
      ],
    );

    assert.ok(connection.backupPath);
    assert.ok(existsSync(connection.backupPath));
    const backup = new Database(connection.backupPath, { readonly: true });
    try {
      assert.equal(backup.pragma("user_version", { simple: true }), 0);
      assert.equal(
        backup
          .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'pages'")
          .get().count,
        0,
      );
    } finally {
      backup.close();
    }

    assert.throws(
      () =>
        connection.sqlite
          .prepare(
            `INSERT INTO pages (id, parent_id, title, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(uuidv7(), "missing-parent", "Child", "a", new Date().toISOString(), new Date().toISOString()),
      /FOREIGN KEY constraint failed/,
    );

    const changeId = uuidv7();
    connection.sqlite
      .prepare(
        `INSERT INTO change_log
          (id, device_id, entity_type, entity_id, operation, payload_json, created_at)
         VALUES (?, ?, 'page', ?, 'create', '{}', ?)`,
      )
      .run(changeId, device.id, uuidv7(), new Date().toISOString());
    assert.throws(
      () =>
        connection.sqlite
          .prepare("UPDATE change_log SET operation = 'update' WHERE id = ?")
          .run(changeId),
      /change_log is append-only/,
    );
    assert.throws(
      () => connection.sqlite.prepare("DELETE FROM change_log WHERE id = ?").run(changeId),
      /change_log is append-only/,
    );
  } finally {
    connection?.sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("backs up an existing database and rolls back a failed migration", async () => {
  const directory = createTemporaryDirectory();
  const databasePath = path.join(directory, "lifeos.sqlite");

  try {
    const original = new Database(databasePath);
    original.exec(
      "CREATE TABLE pages (legacy_value TEXT NOT NULL); INSERT INTO pages VALUES ('preserved');",
    );
    original.close();

    await assert.rejects(openDatabase(directory), (error) => {
      assert.equal(error.name, "MigrationError");
      assert.equal(error.version, 1);
      assert.ok(existsSync(error.backupPath));
      return true;
    });

    const backupDirectory = path.join(directory, "backups");
    const backupNames = readdirSync(backupDirectory);
    assert.equal(backupNames.length, 1);

    const backup = new Database(path.join(backupDirectory, backupNames[0]), {
      readonly: true,
    });
    try {
      assert.equal(
        backup.prepare("SELECT legacy_value FROM pages").get().legacy_value,
        "preserved",
      );
      assert.equal(
        backup
          .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'devices'")
          .get().count,
        0,
      );
    } finally {
      backup.close();
    }

    const unchanged = new Database(databasePath, { readonly: true });
    try {
      assert.equal(
        unchanged
          .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'devices'")
          .get().count,
        0,
      );
    } finally {
      unchanged.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generates RFC 9562 UUIDv7 identifiers", () => {
  const before = Date.now();
  const id = uuidv7();
  const after = Date.now();

  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  const timestamp = Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16);
  assert.ok(timestamp >= before && timestamp <= after);
});
