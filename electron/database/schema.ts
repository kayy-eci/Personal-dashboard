import {
  index,
  integer,
  sqliteTable,
  text,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pages = sqliteTable(
  "pages",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id").references(
      (): AnySQLiteColumn => pages.id,
      { onDelete: "set null" },
    ),
    title: text("title").notNull().default("Untitled"),
    icon: text("icon"),
    position: text("position").notNull(),
    isFavorite: integer("is_favorite", { mode: "boolean" })
      .notNull()
      .default(false),
    contentJson: text("content_json")
      .notNull()
      .default('{"type":"doc","content":[{"type":"paragraph"}]}'),
    schemaVersion: integer("schema_version").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("pages_parent_position_idx").on(table.parentId, table.position),
    index("pages_deleted_at_idx").on(table.deletedAt),
  ],
);

export const changeLog = sqliteTable(
  "change_log",
  {
    sequence: integer("sequence").primaryKey({ autoIncrement: true }),
    id: text("id").notNull().unique(),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id),
    entityType: text("entity_type", { enum: ["page"] }).notNull(),
    entityId: text("entity_id").notNull(),
    operation: text("operation", {
      enum: ["create", "update", "move", "delete", "restore"],
    }).notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("change_log_entity_idx").on(table.entityType, table.entityId),
    index("change_log_created_at_idx").on(table.createdAt),
  ],
);
