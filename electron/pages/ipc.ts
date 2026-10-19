import type { IpcMainInvokeEvent } from "electron";
import Database from "better-sqlite3";
import {
  hasNoIpcArgs,
  isCreatePageArgs,
  isMovePageArgs,
  isPageIdArgs,
  isRenamePageArgs,
  isSavePageContentArgs,
} from "../ipc-contract";
import { registerIpcHandler } from "../ipc-main";
import { PageRepository, PageRepositoryError } from "./repository";

function runPageOperation<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof PageRepositoryError) {
      throw new Error(error.message);
    }
    if (error instanceof Database.SqliteError) {
      console.error("LifeOS page database operation failed", error);
      throw new Error("The page operation could not be completed");
    }
    throw error;
  }
}

export function registerPageIpcHandlers(
  validateSender: (event: IpcMainInvokeEvent) => void,
  getRepository: () => PageRepository,
): void {
  registerIpcHandler(
    "pages:create",
    isCreatePageArgs,
    validateSender,
    (_event, input) => runPageOperation(() => getRepository().createPage(input)),
  );
  registerIpcHandler(
    "pages:rename",
    isRenamePageArgs,
    validateSender,
    (_event, input) =>
      runPageOperation(() =>
        getRepository().renamePage(input.pageId, input.title),
      ),
  );
  registerIpcHandler(
    "pages:move",
    isMovePageArgs,
    validateSender,
    (_event, input) =>
      runPageOperation(() =>
        getRepository().movePage(input.pageId, {
          parentId: input.parentId,
          beforeId: input.beforeId,
          afterId: input.afterId,
        }),
      ),
  );
  registerIpcHandler(
    "pages:delete",
    isPageIdArgs,
    validateSender,
    (_event, input) =>
      runPageOperation(() => getRepository().deletePage(input.pageId)),
  );
  registerIpcHandler(
    "pages:restore",
    isPageIdArgs,
    validateSender,
    (_event, input) =>
      runPageOperation(() => getRepository().restorePage(input.pageId)),
  );
  registerIpcHandler(
    "pages:list-tree",
    hasNoIpcArgs,
    validateSender,
    () => runPageOperation(() => getRepository().listTree()),
  );
  registerIpcHandler(
    "pages:list-trash",
    hasNoIpcArgs,
    validateSender,
    () => runPageOperation(() => getRepository().listTrash()),
  );
  registerIpcHandler(
    "pages:get-content",
    isPageIdArgs,
    validateSender,
    (_event, input) =>
      runPageOperation(() => getRepository().getContent(input.pageId)),
  );
  registerIpcHandler(
    "pages:save-content",
    isSavePageContentArgs,
    validateSender,
    (_event, input) =>
      runPageOperation(() =>
        getRepository().saveContent(input.pageId, {
          contentJson: input.contentJson,
        }),
      ),
  );
}
