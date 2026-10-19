import { contextBridge, ipcRenderer } from "electron";
import type {
  IpcArgs,
  IpcChannel,
  IpcResult,
  LifeOsAPI,
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
  listPageTree: () => invokeIpc("pages:list-tree"),
  listTrash: () => invokeIpc("pages:list-trash"),
  getPageContent: (input) => invokeIpc("pages:get-content", input),
  savePageContent: (input) => invokeIpc("pages:save-content", input),
};

contextBridge.exposeInMainWorld("lifeos", lifeosApi);
