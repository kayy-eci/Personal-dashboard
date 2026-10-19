export interface CreatePageInput {
  parentId?: string | null;
  title?: string;
}

export interface RenamePageInput {
  pageId: string;
  title: string;
}

export interface PageIdInput {
  pageId: string;
}

export interface MovePageInput {
  pageId: string;
  parentId: string | null;
  beforeId?: string;
  afterId?: string;
}

export interface SavePageContentInput {
  pageId: string;
  contentJson: string;
}

/** Upper bound for stored page documents. */
export const PAGE_CONTENT_MAX_LENGTH = 4 * 1024 * 1024;

export interface PageContent {
  pageId: string;
  contentJson: string;
  schemaVersion: number;
  updatedAt: string;
}

export interface PageRecord {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  position: string;
  isFavorite: boolean;
  contentJson: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PageTreeNode
  extends Omit<PageRecord, "contentJson" | "schemaVersion"> {
  children: PageTreeNode[];
}

export type PageTrashEntry = Omit<PageTreeNode, "children">;

export type PageRepositoryErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "CYCLE"
  | "CORRUPT_TREE";
