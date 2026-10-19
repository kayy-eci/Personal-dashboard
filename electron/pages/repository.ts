import { and, eq, isNull, ne } from "drizzle-orm";
import type Database from "better-sqlite3";
import type { LifeOsDatabase } from "../database";
import { changeLog, pages } from "../database/schema";
import { uuidv7 } from "../database/uuid";
import { PAGE_CONTENT_MAX_LENGTH, TRASH_RETENTION_DAYS } from "./types";
import type {
  CreatePageInput,
  MovePageInput,
  PageContent,
  PageRecord,
  PageRepositoryErrorCode,
  PageTrashEntry,
  PageTreeNode,
  SavePageContentInput,
} from "./types";

const positionLimit = 0xffff_ffff_ffff_ffffn;
const positionPattern = /^[0-9a-f]{16}$/;

/**
 * FR-1.1: document schema version 2 means every top-level block carries a
 * stable unique `id`. Documents saved by older versions migrate lazily:
 * ids are assigned when a page loads (getContent) or is saved (saveContent).
 */
const DOC_SCHEMA_VERSION = 2;

interface DocumentNode {
  type: string;
  attrs?: Record<string, unknown>;
}

interface DocumentJson {
  type: string;
  content?: DocumentNode[];
}

export interface BlockIdNormalization {
  contentJson: string;
  assignedIds: number;
}

/**
 * Assigns a stable unique id to every top-level document block that lacks
 * one. Returns null when the stored JSON is not a parseable document and the
 * caller must persist the input unchanged.
 */
export function normalizeBlockIds(
  contentJson: string,
  nextId: () => string,
): BlockIdNormalization | null {
  let document: DocumentJson;
  try {
    document = JSON.parse(contentJson) as DocumentJson;
  } catch {
    return null;
  }
  if (!isDocumentContent(document)) {
    return null;
  }

  let assignedIds = 0;
  for (const node of document.content!) {
    const attrs =
      typeof node.attrs === "object" && node.attrs !== null
        ? node.attrs
        : (node.attrs = {});
    if (typeof attrs.id !== "string" || attrs.id === "") {
      attrs.id = nextId();
      assignedIds += 1;
    }
  }
  return { contentJson: JSON.stringify(document), assignedIds };
}

export class PageRepositoryError extends Error {
  constructor(
    readonly code: PageRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PageRepositoryError";
  }
}

function encodePosition(value: bigint): string {
  return value.toString(16).padStart(16, "0");
}

function parsePosition(position: string): bigint {
  if (!positionPattern.test(position)) {
    throw new PageRepositoryError("CORRUPT_TREE", "A page has an invalid position");
  }
  return BigInt(`0x${position}`);
}

function comparePages(
  left: Pick<PageRecord, "id" | "position">,
  right: Pick<PageRecord, "id" | "position">,
): number {
  return left.position < right.position
    ? -1
    : left.position > right.position
      ? 1
      : left.id.localeCompare(right.id);
}

function isDocumentContent(value: DocumentJson | unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const typed = value as { type?: unknown; content?: unknown };
  return (
    typed.type === "doc" &&
    Array.isArray(typed.content) &&
    typed.content.length > 0 &&
    typed.content.every(
      (node) =>
        typeof node === "object" && node !== null && typeof (node as { type?: unknown }).type === "string",
    )
  );
}

function pageTreeNode(page: PageRecord): PageTreeNode {
  return {
    id: page.id,
    parentId: page.parentId,
    title: page.title,
    icon: page.icon,
    cover: page.cover,
    position: page.position,
    isFavorite: page.isFavorite,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    deletedAt: page.deletedAt,
    children: [],
  };
}

export class PageRepository {
  private readonly isDescendantStatement: Database.Statement<
    [string, string],
    { found: number }
  >;

  constructor(
    private readonly db: LifeOsDatabase,
    private readonly sqlite: InstanceType<typeof Database>,
    private readonly deviceId: string,
  ) {
    this.isDescendantStatement = sqlite.prepare<[string, string], { found: number }>(
      `WITH RECURSIVE descendants(id) AS (
         SELECT id FROM pages WHERE id = ?
         UNION
         SELECT child.id
         FROM pages AS child
         INNER JOIN descendants ON child.parent_id = descendants.id
       )
       SELECT EXISTS (
         SELECT 1 FROM descendants WHERE id = ?
       ) AS found`,
    );
  }

  createPage(input: CreatePageInput = {}): PageRecord {
    const title = input.title === undefined ? "Untitled" : input.title.trim();
    if (!title || title.length > 500) {
      throw new PageRepositoryError("INVALID_INPUT", "Page title is invalid");
    }

    return this.transact(() => {
      const parentId = input.parentId ?? null;
      if (parentId !== null) {
        this.requireActivePage(parentId);
      }

      const siblings = this.getSiblings(parentId);
      const position = this.positionForAppend(siblings);
      if (position.rebalanced) {
        this.applyRebalancedPositions(position.rebalanced, new Date().toISOString());
      }

      const timestamp = new Date().toISOString();
      const pageId = uuidv7();
      this.db
        .insert(pages)
        .values({
          id: pageId,
          parentId,
          title,
          position: position.position,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();

      this.logChange(pageId, "create", {
        parentId,
        position: position.position,
        title,
      }, timestamp);
      return this.requirePage(pageId);
    });
  }

  getContent(pageId: string): PageContent {
    const page = this.requireActivePage(pageId);
    const normalized = normalizeBlockIds(page.contentJson, uuidv7);
    if (normalized === null) {
      return {
        pageId: page.id,
        contentJson: page.contentJson,
        schemaVersion: page.schemaVersion,
        updatedAt: page.updatedAt,
      };
    }

    const needsPersist =
      normalized.assignedIds > 0 || page.schemaVersion < DOC_SCHEMA_VERSION;
    if (!needsPersist) {
      return {
        pageId: page.id,
        contentJson: page.contentJson,
        schemaVersion: page.schemaVersion,
        updatedAt: page.updatedAt,
      };
    }

    // FR-1.1 + FR-3.4: stored documents written before block ids migrate on
    // first load; the write itself is a transactional, logged update.
    const timestamp = new Date().toISOString();
    const persisted = this.transact(() => {
      this.db
        .update(pages)
        .set({
          contentJson: normalized.contentJson,
          schemaVersion: DOC_SCHEMA_VERSION,
          updatedAt: timestamp,
        })
        .where(eq(pages.id, pageId))
        .run();
      this.logChange(
        pageId,
        "update",
        {
          schemaVersion: DOC_SCHEMA_VERSION,
          blockIdsAssigned: normalized.assignedIds,
        },
        timestamp,
      );
      return this.requirePage(pageId);
    });

    return {
      pageId: persisted.id,
      contentJson: normalized.contentJson,
      schemaVersion: persisted.schemaVersion,
      updatedAt: persisted.updatedAt,
    };
  }

  saveContent(pageId: string, input: Omit<SavePageContentInput, "pageId">): PageRecord {
    const { contentJson } = input;
    const page = this.requireActivePage(pageId);
    if (
      typeof contentJson !== "string" ||
      contentJson.length === 0 ||
      contentJson.length > PAGE_CONTENT_MAX_LENGTH
    ) {
      throw new PageRepositoryError("INVALID_INPUT", "Page content is invalid");
    }

    const normalized = normalizeBlockIds(contentJson, uuidv7);
    const normalizedJson = normalized ? normalized.contentJson : contentJson;
    let content: unknown;
    try {
      content = JSON.parse(normalizedJson);
    } catch {
      throw new PageRepositoryError("INVALID_INPUT", "Page content is invalid");
    }
    if (!isDocumentContent(content)) {
      throw new PageRepositoryError("INVALID_INPUT", "Page content is invalid");
    }
    const nextSchemaVersion =
      normalized && normalized.assignedIds > 0
        ? DOC_SCHEMA_VERSION
        : page.schemaVersion;

    return this.transact(() => {
      const timestamp = new Date().toISOString();
      this.db
        .update(pages)
        .set({
          contentJson: normalizedJson,
          schemaVersion: nextSchemaVersion,
          updatedAt: timestamp,
        })
        .where(eq(pages.id, pageId))
        .run();
      this.logChange(pageId, "update", {
        contentLength: normalizedJson.length,
        schemaVersion: nextSchemaVersion,
      }, timestamp);
      return this.requirePage(pageId);
    });
  }

  renamePage(pageId: string, title: string): PageRecord {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || normalizedTitle.length > 500) {
      throw new PageRepositoryError("INVALID_INPUT", "Page title is invalid");
    }

    return this.transact(() => {
      const currentPage = this.requireActivePage(pageId);
      const timestamp = new Date().toISOString();
      this.db
        .update(pages)
        .set({ title: normalizedTitle, updatedAt: timestamp })
        .where(eq(pages.id, pageId))
        .run();
      this.logChange(pageId, "update", {
        previousTitle: currentPage.title,
        title: normalizedTitle,
      }, timestamp);
      return this.requirePage(pageId);
    });
  }

  movePage(pageId: string, input: Omit<MovePageInput, "pageId">): PageRecord {
    return this.transact(() => {
      const page = this.requireActivePage(pageId);
      const parentId = input.parentId;
      if (parentId !== null) {
        this.requireActivePage(parentId);
        const result = this.isDescendantStatement.get(pageId, parentId);
        if (result?.found === 1) {
          throw new PageRepositoryError("CYCLE", "A page cannot be moved into itself or a descendant");
        }
      }

      const siblings = this.getSiblings(parentId, pageId);
      let insertionIndex = siblings.length;
      if (input.beforeId !== undefined) {
        insertionIndex = siblings.findIndex(({ id }) => id === input.beforeId);
        if (insertionIndex < 0) {
          throw new PageRepositoryError("INVALID_INPUT", "The before page is not a sibling");
        }
      } else if (input.afterId !== undefined) {
        const anchorIndex = siblings.findIndex(({ id }) => id === input.afterId);
        if (anchorIndex < 0) {
          throw new PageRepositoryError("INVALID_INPUT", "The after page is not a sibling");
        }
        insertionIndex = anchorIndex + 1;
      }

      const oldSiblings = this.getSiblings(page.parentId);
      const oldIndex = oldSiblings.findIndex(({ id }) => id === pageId);
      if (page.parentId === parentId && oldIndex === insertionIndex) {
        return page;
      }

      const position = this.positionBetween(siblings, insertionIndex);
      const timestamp = new Date().toISOString();
      if (position.rebalanced) {
        this.applyRebalancedPositions(position.rebalanced, timestamp);
      }
      this.db
        .update(pages)
        .set({ parentId, position: position.position, updatedAt: timestamp })
        .where(eq(pages.id, pageId))
        .run();
      this.logChange(pageId, "move", {
        previousParentId: page.parentId,
        parentId,
        position: position.position,
      }, timestamp);
      return this.requirePage(pageId);
    });
  }

  deletePage(pageId: string): void {
    this.transact(() => {
      this.requireActivePage(pageId);
      const subtree = this.getSubtree(pageId);
      const timestamp = new Date().toISOString();

      for (const page of subtree) {
        this.db
          .update(pages)
          .set({ deletedAt: timestamp, updatedAt: timestamp })
          .where(eq(pages.id, page.id))
          .run();
        this.logChange(page.id, "delete", { deletedAt: timestamp }, timestamp);
      }
    });
  }

  /**
   * FR-2.6: permanently deletes a trash subtree. Only soft-deleted subtrees
   * qualify; an active page can never be purged by accident.
   */
  purgePage(pageId: string): void {
    this.transact(() => {
      const page = this.requirePage(pageId);
      if (page.deletedAt === null) {
        throw new PageRepositoryError(
          "INVALID_INPUT",
          "Only pages in the trash can be deleted permanently",
        );
      }

      const subtree = this.getSubtree(pageId);
      // Purged tombstones leave nothing to sync, so every row is removed and
      // each removal recorded as a terminal change-log entry.
      for (const subtreePage of subtree) {
        this.logChange(
          subtreePage.id,
          "purge",
          {
            title: subtreePage.title,
            deletedAt: subtreePage.deletedAt,
          },
          new Date().toISOString(),
        );
        this.db.delete(pages).where(eq(pages.id, subtreePage.id)).run();
      }
    });
  }

  /**
   * FR-2.6: automatic purge. Trash entries whose deletion date is older than
   * the retention window are removed; returns how many entries were purged.
   */
  purgeExpiredTrash(now: number, retentionDays = TRASH_RETENTION_DAYS): number {
    const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
    let purged = 0;
    for (const entry of this.listTrash()) {
      const deletedAt = entry.deletedAt === null ? NaN : Date.parse(entry.deletedAt);
      if (!Number.isFinite(deletedAt) || deletedAt > cutoff) {
        continue;
      }
      this.purgePage(entry.id);
      purged += 1;
    }
    return purged;
  }

  restorePage(pageId: string): PageRecord {    return this.transact(() => {
      const page = this.requirePage(pageId);
      if (page.deletedAt === null) {
        throw new PageRepositoryError("NOT_FOUND", `Deleted page ${pageId} was not found`);
      }

      const subtree = this.getSubtree(pageId);
      const parent = page.parentId === null ? undefined : this.findPage(page.parentId);
      const parentId = parent && parent.deletedAt === null ? parent.id : null;
      const timestamp = new Date().toISOString();
      let position = page.position;
      if (page.parentId !== null && parentId === null) {
        const placement = this.positionForAppend(this.getSiblings(null, pageId));
        position = placement.position;
        if (placement.rebalanced) {
          this.applyRebalancedPositions(placement.rebalanced, timestamp);
        }
      }

      for (const descendant of subtree) {
        if (descendant.deletedAt === null) {
          continue;
        }
        const restoredParentId =
          descendant.id === pageId ? parentId : descendant.parentId;
        const restoredPosition =
          descendant.id === pageId ? position : descendant.position;
        this.db
          .update(pages)
          .set({
            parentId: restoredParentId,
            position: restoredPosition,
            deletedAt: null,
            updatedAt: timestamp,
          })
          .where(eq(pages.id, descendant.id))
          .run();
        this.logChange(descendant.id, "restore", {
          parentId: restoredParentId,
          position: restoredPosition,
        }, timestamp);
      }

      return this.requirePage(pageId);
    });
  }

  listTree(): PageTreeNode[] {
    const activePages = this.db
      .select()
      .from(pages)
      .where(isNull(pages.deletedAt))
      .all();

    const pageById = new Map(activePages.map((page) => [page.id, page]));
    this.assertAcyclic(activePages, pageById);

    const nodeById = new Map(
      activePages.map((page) => [page.id, pageTreeNode(page)]),
    );
    const roots: PageTreeNode[] = [];

    for (const page of activePages) {
      const node = nodeById.get(page.id)!;
      const parent = page.parentId === null ? undefined : nodeById.get(page.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const pendingNodes = [...roots];
    while (pendingNodes.length > 0) {
      const node = pendingNodes.pop()!;
      node.children.sort(comparePages);
      pendingNodes.push(...node.children);
    }
    roots.sort(comparePages);
    return roots;
  }

  listTrash(): PageTrashEntry[] {
    const allPages = this.db.select().from(pages).all() as PageRecord[];
    const pageById = new Map(allPages.map((page) => [page.id, page]));

    return allPages
      .filter((page) => {
        if (page.deletedAt === null) {
          return false;
        }
        return (
          page.parentId === null ||
          pageById.get(page.parentId)?.deletedAt === null ||
          !pageById.has(page.parentId)
        );
      })
      .sort((left, right) => {
        const deletionOrder = (right.deletedAt ?? "").localeCompare(
          left.deletedAt ?? "",
        );
        return deletionOrder || comparePages(left, right);
      })
      .map((page): PageTrashEntry => ({
        id: page.id,
        parentId: page.parentId,
        title: page.title,
        icon: page.icon,
        cover: page.cover,
        position: page.position,
        isFavorite: page.isFavorite,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        deletedAt: page.deletedAt,
      }));
  }

  private requirePage(pageId: string): PageRecord {
    const page = this.findPage(pageId);
    if (!page) {
      throw new PageRepositoryError("NOT_FOUND", `Page ${pageId} was not found`);
    }
    return page;
  }

  private transact<T>(operation: () => T): T {
    return this.sqlite.transaction(operation).immediate();
  }

  private requireActivePage(pageId: string): PageRecord {
    const page = this.requirePage(pageId);
    if (page.deletedAt !== null) {
      throw new PageRepositoryError("NOT_FOUND", `Active page ${pageId} was not found`);
    }
    return page;
  }

  private findPage(pageId: string): PageRecord | undefined {
    return this.db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId))
      .get();
  }

  private getSiblings(
    parentId: string | null,
    excludingPageId?: string,
  ): PageRecord[] {
    const parentFilter =
      parentId === null ? isNull(pages.parentId) : eq(pages.parentId, parentId);
    const filters = [parentFilter, isNull(pages.deletedAt)];
    if (excludingPageId !== undefined) {
      filters.push(ne(pages.id, excludingPageId));
    }
    const siblings = this.db
      .select()
      .from(pages)
      .where(and(...filters))
      .all();
    return siblings.sort(comparePages);
  }

  private positionForAppend(siblings: PageRecord[]): {
    position: string;
    rebalanced: Array<{ page: PageRecord; position: string }> | null;
  } {
    return this.positionBetween(siblings, siblings.length);
  }

  private positionBetween(
    siblings: PageRecord[],
    insertionIndex: number,
  ): {
    position: string;
    rebalanced: Array<{ page: PageRecord; position: string }> | null;
  } {
    const lower = insertionIndex === 0
      ? 0n
      : parsePosition(siblings[insertionIndex - 1].position);
    const upper = insertionIndex === siblings.length
      ? positionLimit
      : parsePosition(siblings[insertionIndex].position);

    if (upper - lower > 1n) {
      return { position: encodePosition(lower + (upper - lower) / 2n), rebalanced: null };
    }

    const spacing = positionLimit / BigInt(siblings.length + 1);
    const rebalanced = siblings.map((page, index) => ({
      page,
      position: encodePosition(spacing * BigInt(index + 1)),
    }));
    const rebalancedLower =
      insertionIndex === 0 ? 0n : parsePosition(rebalanced[insertionIndex - 1].position);
    const rebalancedUpper =
      insertionIndex === siblings.length
        ? positionLimit
        : parsePosition(rebalanced[insertionIndex].position);
    if (rebalancedUpper - rebalancedLower <= 1n) {
      throw new PageRepositoryError("CORRUPT_TREE", "Sibling positions cannot be rebalanced");
    }

    return {
      position: encodePosition(
        rebalancedLower + (rebalancedUpper - rebalancedLower) / 2n,
      ),
      rebalanced,
    };
  }

  private applyRebalancedPositions(
    positions: Array<{ page: PageRecord; position: string }>,
    timestamp: string,
  ): void {
    for (const { page, position } of positions) {
      this.db
        .update(pages)
        .set({ position, updatedAt: timestamp })
        .where(eq(pages.id, page.id))
        .run();
      this.logChange(page.id, "move", { position }, timestamp);
    }
  }

  private getSubtree(rootId: string): PageRecord[] {
    const allPages = this.db.select().from(pages).all();
    const pageById = new Map(allPages.map((page) => [page.id, page]));
    const children = new Map<string, PageRecord[]>();
    for (const page of allPages) {
      if (page.parentId === null) {
        continue;
      }
      const siblings = children.get(page.parentId) ?? [];
      siblings.push(page);
      children.set(page.parentId, siblings);
    }

    const subtree: PageRecord[] = [];
    const pendingIds = [rootId];
    const visited = new Set<string>();
    while (pendingIds.length > 0) {
      const currentId = pendingIds.pop()!;
      if (visited.has(currentId)) {
        throw new PageRepositoryError("CORRUPT_TREE", "A page hierarchy cycle was found");
      }
      visited.add(currentId);
      const page = pageById.get(currentId);
      if (!page) {
        throw new PageRepositoryError("NOT_FOUND", `Page ${currentId} was not found`);
      }
      subtree.push(page);
      pendingIds.push(...(children.get(currentId) ?? []).map(({ id }) => id));
    }
    return subtree;
  }

  private assertAcyclic(
    activePages: PageRecord[],
    pageById: Map<string, PageRecord>,
  ): void {
    const visited = new Set<string>();
    for (const page of activePages) {
      const path: string[] = [];
      const pathIds = new Set<string>();
      let current: PageRecord | undefined = page;
      while (current) {
        if (visited.has(current.id)) {
          break;
        }
        if (pathIds.has(current.id)) {
          throw new PageRepositoryError("CORRUPT_TREE", "A page hierarchy cycle was found");
        }
        path.push(current.id);
        pathIds.add(current.id);
        current =
          current.parentId === null ? undefined : pageById.get(current.parentId);
      }
      for (const id of path) {
        visited.add(id);
      }
    }
  }

  private logChange(
    pageId: string,
    operation: "create" | "update" | "move" | "delete" | "restore" | "purge",
    payload: Record<string, unknown>,
    timestamp: string,
  ): void {
    this.db
      .insert(changeLog)
      .values({
        id: uuidv7(),
        deviceId: this.deviceId,
        entityType: "page",
        entityId: pageId,
        operation,
        payloadJson: JSON.stringify(payload),
        createdAt: timestamp,
      })
      .run();
  }
}
