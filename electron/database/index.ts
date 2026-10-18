import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { runMigrations } from "./migrations";
import { uuidv7 } from "./uuid";

function createDrizzleDatabase(sqlite: InstanceType<typeof Database>) {
  return drizzle({ client: sqlite, schema });
}

export type LifeOsDatabase = ReturnType<typeof createDrizzleDatabase>;

export interface DatabaseConnection {
  sqlite: InstanceType<typeof Database>;
  db: LifeOsDatabase;
  databasePath: string;
  backupPath: string | null;
}

export async function openDatabase(
  userDataDirectory: string,
): Promise<DatabaseConnection> {
  mkdirSync(userDataDirectory, { recursive: true });
  const databasePath = join(userDataDirectory, "lifeos.sqlite");
  const sqlite = new Database(databasePath);

  try {
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = FULL");

    const backupPath = await runMigrations(sqlite, userDataDirectory);
    const db = createDrizzleDatabase(sqlite);
    const [device] = db.select({ id: schema.devices.id }).from(schema.devices).limit(1).all();

    if (!device) {
      const timestamp = new Date().toISOString();
      db.insert(schema.devices)
        .values({
          id: uuidv7(),
          name: "This device",
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    }

    return { sqlite, db, databasePath, backupPath };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}
