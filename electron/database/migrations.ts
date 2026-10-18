import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";

interface Migration {
  version: number;
  sql: string;
}

export class MigrationError extends Error {
  constructor(
    readonly version: number,
    readonly backupPath: string,
    cause: unknown,
  ) {
    super(`Database migration ${version} failed`, { cause });
    this.name = "MigrationError";
  }
}

const migrations: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pages (
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

      CREATE INDEX IF NOT EXISTS pages_parent_position_idx
        ON pages(parent_id, position);
      CREATE INDEX IF NOT EXISTS pages_deleted_at_idx
        ON pages(deleted_at);

      CREATE TABLE IF NOT EXISTS change_log (
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

      CREATE INDEX IF NOT EXISTS change_log_entity_idx
        ON change_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS change_log_created_at_idx
        ON change_log(created_at);

      CREATE TRIGGER IF NOT EXISTS change_log_no_update
        BEFORE UPDATE ON change_log
        BEGIN
          SELECT RAISE(ABORT, 'change_log is append-only');
        END;

      CREATE TRIGGER IF NOT EXISTS change_log_no_delete
        BEFORE DELETE ON change_log
        BEGIN
          SELECT RAISE(ABORT, 'change_log is append-only');
        END;
    `,
  },
];

function createBackupPath(userDataDirectory: string, version: number): string {
  const backupDirectory = join(userDataDirectory, "backups");
  mkdirSync(backupDirectory, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  let backupPath = join(
    backupDirectory,
    `lifeos-pre-migration-v${version}-${timestamp}.sqlite`,
  );
  let suffix = 1;

  while (existsSync(backupPath)) {
    backupPath = join(
      backupDirectory,
      `lifeos-pre-migration-v${version}-${timestamp}-${suffix}.sqlite`,
    );
    suffix += 1;
  }

  return backupPath;
}

export async function runMigrations(
  sqlite: InstanceType<typeof Database>,
  userDataDirectory: string,
): Promise<string | null> {
  const currentVersionValue: unknown = sqlite.pragma("user_version", {
    simple: true,
  });
  const latestVersion = migrations.at(-1)?.version ?? 0;

  if (
    typeof currentVersionValue !== "number" ||
    !Number.isInteger(currentVersionValue) ||
    currentVersionValue < 0
  ) {
    throw new Error("The database has an invalid schema version");
  }
  const currentVersion = currentVersionValue;
  if (currentVersion > latestVersion) {
    throw new Error(
      `Database schema version ${currentVersion} is newer than this app supports`,
    );
  }

  const pendingMigrations = migrations.filter(
    (migration) => migration.version > currentVersion,
  );
  if (pendingMigrations.length === 0) {
    return null;
  }

  const backupPath = createBackupPath(userDataDirectory, currentVersion);
  await sqlite.backup(backupPath);

  for (const migration of pendingMigrations) {
    const applyMigration = sqlite.transaction(() => {
      sqlite.exec(migration.sql);
      sqlite.pragma(`user_version = ${migration.version}`);
    });
    try {
      applyMigration();
    } catch (error) {
      throw new MigrationError(migration.version, backupPath, error);
    }
  }

  return backupPath;
}
