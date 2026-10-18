import {
  app,
  BrowserWindow,
  dialog,
  net,
  protocol,
  shell,
  type IpcMainInvokeEvent,
} from "electron";
import { realpath, stat } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { openDatabase, type DatabaseConnection } from "./database";
import { MigrationError } from "./database/migrations";
import { devices } from "./database/schema";
import { registerIpcHandler } from "./ipc-main";
import { registerPageIpcHandlers } from "./pages/ipc";
import { PageRepository } from "./pages/repository";

const appScheme = "lifeos";
const developmentUrl = process.env.LIFEOS_DEV_SERVER_URL;
const developmentOrigin = developmentUrl
  ? new URL(developmentUrl).origin
  : undefined;
const exportDirectory = resolve(__dirname, "../../out");

protocol.registerSchemesAsPrivileged([
  {
    scheme: appScheme,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let databaseConnection: DatabaseConnection | null = null;
let pageRepository: PageRepository | null = null;

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

async function serveExport(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  if (
    requestUrl.hostname !== "app" ||
    (request.method !== "GET" && request.method !== "HEAD")
  ) {
    return notFound();
  }

  let relativePath: string;
  try {
    relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
  } catch {
    return notFound();
  }

  const candidate = resolve(exportDirectory, relativePath || "index.html");
  if (!candidate.startsWith(`${exportDirectory}${sep}`)) {
    return notFound();
  }

  try {
    const [exportRoot, assetPath] = await Promise.all([
      realpath(exportDirectory),
      realpath(candidate),
    ]);
    if (!assetPath.startsWith(`${exportRoot}${sep}`)) {
      return notFound();
    }

    const asset = await stat(assetPath);
    if (!asset.isFile()) {
      return notFound();
    }

    const response = await net.fetch(pathToFileURL(assetPath).href);
    if (extname(assetPath) !== ".html") {
      return response;
    }

    const html = await response.text();
    const policy = html.match(
      /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i,
    )?.[1];
    if (!policy) {
      throw new Error(`Static HTML is missing its Content-Security-Policy: ${assetPath}`);
    }

    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", `${policy}; frame-ancestors 'none'`);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "no-referrer");
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    if (isNodeError(error, "ENOENT")) {
      return notFound();
    }
    throw error;
  }
}

function isTrustedRendererUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return developmentOrigin
      ? url.origin === developmentOrigin
      : url.protocol === `${appScheme}:` && url.hostname === "app";
  } catch {
    return false;
  }
}

function validateIpcSender(event: IpcMainInvokeEvent): void {
  if (
    !mainWindow ||
    BrowserWindow.fromWebContents(event.sender) !== mainWindow ||
    event.senderFrame !== event.sender.mainFrame ||
    !isTrustedRendererUrl(event.senderFrame.url)
  ) {
    throw new Error("Untrusted IPC sender");
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 800,
    minHeight: 560,
    title: "LifeOS",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedRendererUrl(url)) {
      event.preventDefault();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow
    .loadURL(developmentUrl ?? `${appScheme}://app/index.html`)
    .catch((error: unknown) => {
      console.error("LifeOS renderer failed to load", error);
      app.quit();
    });
}

registerIpcHandler(
  "app:get-version",
  (args): args is [] => args.length === 0,
  validateIpcSender,
  () => app.getVersion(),
);

registerPageIpcHandlers(validateIpcSender, () => {
  if (!pageRepository) {
    throw new Error("The page repository is not initialized");
  }
  return pageRepository;
});

void app.whenReady().then(async () => {
  databaseConnection = await openDatabase(app.getPath("userData"));
  const device = databaseConnection.db
    .select({ id: devices.id })
    .from(devices)
    .limit(1)
    .get();
  if (!device) {
    throw new Error("LifeOS device identity is missing");
  }
  pageRepository = new PageRepository(
    databaseConnection.db,
    databaseConnection.sqlite,
    device.id,
  );
  protocol.handle(appScheme, serveExport);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  createWindow();
}).catch(async (error: unknown) => {
  console.error("LifeOS failed to start", error);
  try {
    if (error instanceof MigrationError) {
      const backupDirectory = dirname(error.backupPath);
      const result = await dialog.showMessageBox({
        type: "error",
        title: "LifeOS database migration failed",
        message: "The database migration failed. Your existing database was left unchanged.",
        detail: `A pre-migration backup is available in:\n${backupDirectory}`,
        buttons: ["Open backup folder", "Quit"],
        defaultId: 1,
        cancelId: 1,
      });

      if (result.response === 0) {
        const openError = await shell.openPath(backupDirectory);
        if (openError) {
          dialog.showErrorBox("Could not open backup folder", openError);
        }
      }
    } else {
      dialog.showErrorBox(
        "LifeOS failed to start",
        "LifeOS could not initialize its local workspace. Check the application data directory and try again.",
      );
    }
  } catch (displayError) {
    console.error("LifeOS could not display startup recovery options", displayError);
  } finally {
    app.quit();
  }
});

app.on("before-quit", () => {
  pageRepository = null;
  if (databaseConnection) {
    databaseConnection.sqlite.close();
    databaseConnection = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
