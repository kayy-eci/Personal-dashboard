import { ipcMain, type IpcMainInvokeEvent } from "electron";
import type { IpcArgs, IpcChannel, IpcResult } from "./ipc-contract";

export function registerIpcHandler<Channel extends IpcChannel>(
  channel: Channel,
  validateArgs: (args: unknown[]) => args is IpcArgs<Channel>,
  validateSender: (event: IpcMainInvokeEvent) => void,
  handler: (
    event: IpcMainInvokeEvent,
    ...args: IpcArgs<Channel>
  ) => IpcResult<Channel>,
): void {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    validateSender(event);

    if (!validateArgs(args)) {
      throw new TypeError(`Invalid IPC arguments for ${channel}`);
    }

    return handler(event, ...args);
  });
}
