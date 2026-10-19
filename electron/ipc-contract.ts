import type {
  CreatePageInput,
  MovePageInput,
  PageContent,
  PageIdInput,
  PageRecord,
  PageTrashEntry,
  PageTreeNode,
  RenamePageInput,
  SavePageContentInput,
} from "./pages/types";
import { PAGE_CONTENT_MAX_LENGTH } from "./pages/types";
import {
  ATTACHMENT_MAX_BYTES,
  type StoredAttachment,
  isSupportedImageMime,
} from "./attachments/store";

export interface IpcContract {
  "app:get-version": {
    args: [];
    result: string;
  };
  "pages:create": {
    args: [input: CreatePageInput];
    result: PageRecord;
  };
  "pages:rename": {
    args: [input: RenamePageInput];
    result: PageRecord;
  };
  "pages:move": {
    args: [input: MovePageInput];
    result: PageRecord;
  };
  "pages:delete": {
    args: [input: PageIdInput];
    result: void;
  };
  "pages:restore": {
    args: [input: PageIdInput];
    result: PageRecord;
  };
  /**
   * FR-2.6: permanent deletion of a trash subtree. The renderer must ask for
   * confirmation before calling; the main process refuses active pages.
   */
  "pages:purge": {
    args: [input: PageIdInput];
    result: void;
  };
  "pages:list-tree": {
    args: [];
    result: PageTreeNode[];
  };
  "pages:list-trash": {
    args: [];
    result: PageTrashEntry[];
  };
  "pages:get-content": {
    args: [input: PageIdInput];
    result: PageContent;
  };
  "pages:save-content": {
    args: [input: SavePageContentInput];
    result: PageRecord;
  };
  "attachments:save": {
    args: [input: SaveAttachmentInput];
    result: StoredAttachment;
  };
  /**
   * FR-3.2: push channels. The main process asks the renderer to flush before
   * a window close; the renderer answers over "app:flush-done".
   */
  "app:request-flush": {
    args: [];
    result: void;
  };
  "app:flush-done": {
    args: [];
    result: void;
  };
  /**
   * FR-4.3: push channel for native menu items. Accelerators stay in the main
   * process; the renderer executes the actions.
   */
  "app:menu-action": {
    args: [action: MenuAction];
    result: void;
  };
}

export type MenuAction =
  | "new-page"
  | "toggle-sidebar"
  | "toggle-theme"
  | "show-shortcuts";

export interface SaveAttachmentInput {
  mime: string;
  bytes: ArrayBuffer;
}

export type IpcChannel = keyof IpcContract;
export type IpcArgs<Channel extends IpcChannel> = IpcContract[Channel]["args"];
export type IpcResult<Channel extends IpcChannel> = IpcContract[Channel]["result"];

const pageIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedKeys = {
  create: new Set(["parentId", "title"]),
  move: new Set(["pageId", "parentId", "beforeId", "afterId"]),
  pageId: new Set(["pageId"]),
  rename: new Set(["pageId", "title"]),
  saveContent: new Set(["pageId", "contentJson"]),
  saveAttachment: new Set(["mime", "bytes"]),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isPageId(value: unknown): value is string {
  return typeof value === "string" && pageIdPattern.test(value);
}

function isOptionalTitle(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= 500)
  );
}

export function isCreatePageArgs(args: unknown[]): args is [CreatePageInput] {
  const [input] = args;
  return (
    args.length === 1 &&
    isRecord(input) &&
    hasOnlyKeys(input, allowedKeys.create) &&
    (input.parentId === undefined ||
      input.parentId === null ||
      isPageId(input.parentId)) &&
    isOptionalTitle(input.title)
  );
}

export function isRenamePageArgs(args: unknown[]): args is [RenamePageInput] {
  const [input] = args;
  return (
    args.length === 1 &&
    isRecord(input) &&
    hasOnlyKeys(input, allowedKeys.rename) &&
    isPageId(input.pageId) &&
    typeof input.title === "string" &&
    input.title.trim().length > 0 &&
    input.title.length <= 500
  );
}

export function isMovePageArgs(args: unknown[]): args is [MovePageInput] {
  const [input] = args;
  return (
    args.length === 1 &&
    isRecord(input) &&
    hasOnlyKeys(input, allowedKeys.move) &&
    isPageId(input.pageId) &&
    (input.parentId === null || isPageId(input.parentId)) &&
    (input.beforeId === undefined || isPageId(input.beforeId)) &&
    (input.afterId === undefined || isPageId(input.afterId)) &&
    !(input.beforeId !== undefined && input.afterId !== undefined) &&
    input.beforeId !== input.pageId &&
    input.afterId !== input.pageId
  );
}

export function isPageIdArgs(args: unknown[]): args is [PageIdInput] {
  const [input] = args;
  return (
    args.length === 1 &&
    isRecord(input) &&
    hasOnlyKeys(input, allowedKeys.pageId) &&
    isPageId(input.pageId)
  );
}

export function hasNoIpcArgs(args: unknown[]): args is [] {
  return args.length === 0;
}

export function isSavePageContentArgs(
  args: unknown[],
): args is [SavePageContentInput] {
  const [input] = args;
  return (
    args.length === 1 &&
    isRecord(input) &&
    hasOnlyKeys(input, allowedKeys.saveContent) &&
    isPageId(input.pageId) &&
    typeof input.contentJson === "string" &&
    input.contentJson.length > 0 &&
    input.contentJson.length <= PAGE_CONTENT_MAX_LENGTH
  );
}

export function isSaveAttachmentArgs(
  args: unknown[],
): args is [SaveAttachmentInput] {
  const [input] = args;
  return (
    args.length === 1 &&
    isRecord(input) &&
    hasOnlyKeys(input, allowedKeys.saveAttachment) &&
    isSupportedImageMime(input.mime) &&
    input.bytes instanceof ArrayBuffer &&
    input.bytes.byteLength > 0 &&
    input.bytes.byteLength <= ATTACHMENT_MAX_BYTES
  );
}

export interface LifeOsAPI {
  getAppVersion(): Promise<string>;
  createPage(input?: CreatePageInput): Promise<PageRecord>;
  renamePage(input: RenamePageInput): Promise<PageRecord>;
  movePage(input: MovePageInput): Promise<PageRecord>;
  deletePage(input: PageIdInput): Promise<void>;
  restorePage(input: PageIdInput): Promise<PageRecord>;
  purgePage(input: PageIdInput): Promise<void>;
  listPageTree(): Promise<PageTreeNode[]>;
  listTrash(): Promise<PageTrashEntry[]>;
  getPageContent(input: PageIdInput): Promise<PageContent>;
  savePageContent(input: SavePageContentInput): Promise<PageRecord>;
  saveAttachment(input: SaveAttachmentInput): Promise<StoredAttachment>;
  onRequestFlush(callback: () => void): () => void;
  signalFlushDone(): void;
  onMenuAction(callback: (action: MenuAction) => void): () => void;
}

declare global {
  interface Window {
    lifeos: LifeOsAPI;
  }
}
