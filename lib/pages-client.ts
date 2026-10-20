import type {
  CreatePageInput,
  MovePageInput,
  PageIdInput,
  PageRecord,
  PageTrashEntry,
  PageTreeNode,
  RenamePageInput,
  SavePageContentInput,
} from "@/electron/pages/types";
import type {
  LifeOsAPI,
  SaveAttachmentInput,
} from "@/electron/ipc-contract";
import type { StoredAttachment } from "@/electron/attachments/store";

export type {
  CreatePageInput,
  MovePageInput,
  PageIdInput,
  PageRecord,
  PageTrashEntry,
  PageTreeNode,
  RenamePageInput,
  SavePageContentInput,
};

export type { LifeOsAPI, SaveAttachmentInput, StoredAttachment };

export function getLifeOsApi(): LifeOsAPI | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.lifeos;
}

export interface PageOperationErrorInfo {
  operation: string;
  message: string;
}

const operationFallbacks = {
  create: "The page could not be created",
  rename: "The page could not be renamed",
  move: "The page could not be moved",
  delete: "The page could not be moved to the trash",
  restore: "The page could not be restored",
  purge: "The page could not be deleted permanently",
  listTree: "The page list could not be loaded",
  listTrash: "The trash could not be loaded",
  getPageContent: "The page content could not be loaded",
  saveContent: "The page could not be saved",
  saveAttachment: "The image could not be saved",
  setPageIcon: "The page icon could not be updated",
  setPageCover: "The page cover could not be updated",
} as const;

export type LifeOsApiOperation = keyof typeof operationFallbacks;

export function describePageOperationError(
  operation: LifeOsApiOperation,
  error: unknown,
): PageOperationErrorInfo {
  const message =
    error instanceof Error &&
    error.message &&
    !/^(Untrusted IPC sender|The page operation could not be completed)$/.test(
      error.message,
    )
      ? error.message
      : operationFallbacks[operation];
  return { operation, message };
}

export async function runPageOperation<T>(
  operation: LifeOsApiOperation,
  run: (api: LifeOsAPI) => Promise<T>,
): Promise<T> {
  const api = getLifeOsApi();
  if (!api) {
    throw describePageOperationError(operation, undefined);
  }
  try {
    return await run(api);
  } catch (error) {
    throw describePageOperationError(operation, error);
  }
}
