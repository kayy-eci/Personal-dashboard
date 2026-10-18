export interface IpcContract {
  "app:get-version": {
    args: [];
    result: string;
  };
}

export type IpcChannel = keyof IpcContract;
export type IpcArgs<Channel extends IpcChannel> = IpcContract[Channel]["args"];
export type IpcResult<Channel extends IpcChannel> = IpcContract[Channel]["result"];

export interface LifeOsAPI {
  getAppVersion(): Promise<string>;
}

declare global {
  interface Window {
    lifeos: LifeOsAPI;
  }
}
