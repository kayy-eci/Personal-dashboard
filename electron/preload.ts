import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type {
  IpcArgs,
  IpcChannel,
  IpcResult,
  LifeOsAPI,
  MenuAction,
} from "./ipc-contract";

function invokeIpc<Channel extends IpcChannel>(
  channel: Channel,
  ...args: IpcArgs<Channel>
): Promise<IpcResult<Channel>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<Channel>>;
}

const lifeosApi: LifeOsAPI = {
  getAppVersion: () => invokeIpc("app:get-version"),
  createPage: (input = {}) => invokeIpc("pages:create", input),
  renamePage: (input) => invokeIpc("pages:rename", input),
  movePage: (input) => invokeIpc("pages:move", input),
  deletePage: (input) => invokeIpc("pages:delete", input),
  restorePage: (input) => invokeIpc("pages:restore", input),
  purgePage: (input) => invokeIpc("pages:purge", input),
  listPageTree: () => invokeIpc("pages:list-tree"),
  listTrash: () => invokeIpc("pages:list-trash"),
  getPageContent: (input) => invokeIpc("pages:get-content", input),
  savePageContent: (input) => invokeIpc("pages:save-content", input),
  savePageIcon: (input) => invokeIpc("pages:set-icon", input),
  savePageCover: (input) => invokeIpc("pages:set-cover", input),
  saveAttachment: (input) => invokeIpc("attachments:save", input),
  onRequestFlush: (callback) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on("app:request-flush", listener);
    return () => {
      ipcRenderer.off("app:request-flush", listener);
    };
  },
  signalFlushDone: () => {
    ipcRenderer.send("app:flush-done");
  },
  onMenuAction: (callback) => {
    const listener = (_event: IpcRendererEvent, action: MenuAction) => {
      callback(action);
    };
    ipcRenderer.on("app:menu-action", listener);
    return () => {
      ipcRenderer.off("app:menu-action", listener);
    };
  },
};

contextBridge.exposeInMainWorld("lifeos", lifeosApi);
