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
};

contextBridge.exposeInMainWorld("lifeos", lifeosApi);
