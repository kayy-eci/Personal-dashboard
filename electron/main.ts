import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  shell,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  type MenuItemConstructorOptions,
} from "electron";
import { realpath, stat } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { cleanupOrphanAttachments } from "./attachments/cleanup";
import { openDatabase, type DatabaseConnection } from "./database";
import { MigrationError } from "./database/migrations";
import { devices, pages } from "./database/schema";
import { isSaveAttachmentArgs, type MenuAction } from "./ipc-contract";
import { registerIpcHandler } from "./ipc-main";
import { registerPageIpcHandlers } from "./pages/ipc";
import { PageRepository } from "./pages/repository";
import {
  attachmentFileNamePattern,
  getMimeForAttachmentFileName,
  saveAttachment,
} from "./attachments/store";
import {
  readWindowBounds,
  writeWindowBounds,
  windowMinHeight,
  windowMinWidth,
  type WindowBounds,
} from "./window-state";

const appScheme = "lifeos";
const developmentUrl = process.env.LIFEOS_DEV_SERVER_URL;
const developmentOrigin = developmentUrl
  ? new URL(developmentUrl).origin
  : undefined;
const exportDirectory = resolve(__dirname, "../../out");
const defaultWindowBounds = { width: 1120, height: 760 };

// Test harness hook: the forced-kill suite (and any future CI run) redirects
// the workspace to a throwaway directory instead of the real user profile.
const userDataOverride = process.env.LIFEOS_USER_DATA_DIR;
if (userDataOverride) {
  app.setPath("userData", resolve(userDataOverride));
}

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

// FR-4.2: one LifeOS instance owns the workspace; a second launch focuses the
// running window instead of opening another shell over the same database.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });
}

function attachmentsDirectory(): string {
  return join(app.getPath("userData"), "attachments");
}

async function serveAttachment(
  relativePath: string,
): Promise<Response | null> {
  if (!relativePath.startsWith("attachment/")) {
    return null;
  }
  const fileName = relativePath.slice("attachment/".length);
  if (!attachmentFileNamePattern.test(fileName)) {
    return notFound();
  }
  const filePath = join(attachmentsDirectory(), fileName);
  try {
    const [file, stats] = await Promise.all([readFile(filePath), stat(filePath)]);
    if (!stats.isFile()) {
      return notFound();
    }
    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type":
          getMimeForAttachmentFileName(fileName) ?? "application/octet-stream",
        "Content-Length": String(stats.size),
        "Cache-Control": "private, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}

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

  const attachmentResponse = await serveAttachment(relativePath);
  if (attachmentResponse) {
    return attachmentResponse;
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

/**
 * FR-3.2: an immediate flush on window close and quit. The renderer flushes
 * its dirty pages and answers over "app:flush-done"; a fail-safe timer closes
 * the window anyway so data already committed by past saves stays durable.
 */
let closeFlushComplete = false;
let closeFlushResolver: (() => void) | null = null;

/** FR-4.2: captures the current (normal) bounds so the next launch restores them. */
async function persistWindowState(): Promise<void> {
  const window = mainWindow;
  if (!window || window.isDestroyed()) {
    return;
  }
  try {
    await writeWindowBounds(app.getPath("userData"), {
      ...window.getNormalBounds(),
      maximized: window.isMaximized(),
    });
  } catch (error) {
    console.warn("LifeOS could not persist window state", error);
  }
}

async function finishFlushClose(): Promise<void> {
  closeFlushComplete = true;
  closeFlushResolver = null;
  await persistWindowState();
  mainWindow?.close();
}

function validateFlushReply(event: IpcMainEvent): boolean {
  return Boolean(
    mainWindow &&
      event.sender === mainWindow.webContents &&
      event.senderFrame === event.sender.mainFrame &&
      isTrustedRendererUrl(event.senderFrame.url),
  );
}

ipcMain.on("app:flush-done", (event) => {
  if (validateFlushReply(event)) {
    const resolveClose = closeFlushResolver;
    closeFlushResolver = null;
    resolveClose?.();
  }
});

function createWindow(bounds: WindowBounds): void {
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    ...(bounds.x !== undefined && bounds.y !== undefined
      ? { x: bounds.x, y: bounds.y }
      : {}),
    minWidth: windowMinWidth,
    minHeight: windowMinHeight,
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
  if (bounds.maximized) {
    mainWindow.maximize();
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedRendererUrl(url)) {
      event.preventDefault();
    }
  });
  mainWindow.on("close", (event) => {
    const window = mainWindow;
    if (!window || closeFlushComplete || window.webContents.isDestroyed()) {
      return;
    }
    if (closeFlushResolver) {
      // A flush round is already running; keep this close prevented.
      event.preventDefault();
      return;
    }
    event.preventDefault();
    window.webContents.send("app:request-flush");
    closeFlushResolver = finishFlushClose;
    setTimeout(() => {
      if (closeFlushResolver === finishFlushClose) {
        finishFlushClose();
      }
    }, 2500);
  });
  mainWindow.on("closed", () => {
    closeFlushResolver = null;
    mainWindow = null;
  });

  void mainWindow
    .loadURL(developmentUrl ?? `${appScheme}://app/index.html`)
    .catch((error: unknown) => {
      console.error("LifeOS renderer failed to load", error);
      app.quit();
    });
}

/**
 * FR-4.3: native application menu. Standard roles keep OS-correct shortcuts
 * and menu semantics; LifeOS-specific actions are pushed to the renderer over
 * the typed "app:menu-action" channel.
 */
function sendMenuAction(action: MenuAction): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send("app:menu-action", action);
}

function buildApplicationMenu(): void {
  const isMac = process.platform === "darwin";
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New page",
          accelerator: "CmdOrCtrl+N",
          click: () => sendMenuAction("new-page"),
        },
        {
          label: "Toggle sidebar",
          accelerator: "CmdOrCtrl+Shift+B",
          click: () => sendMenuAction("toggle-sidebar"),
        },
        {
          label: "Toggle theme",
          accelerator: "CmdOrCtrl+Shift+L",
          click: () => sendMenuAction("toggle-theme"),
        },
        { type: "separator" },
        {
          label: "Shortcut cheat sheet",
          accelerator: "CmdOrCtrl+/",
          click: () => sendMenuAction("show-shortcuts"),
        },
        { type: "separator" },
        ...(isMac ? [] : [{ role: "quit" as const }]),
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        {
          role: "pasteAndMatchStyle",
          accelerator: "Shift+CmdOrCtrl+V",
        },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/** FR-3.6: weekly sweep of attachment files that no page references anymore. */
async function scheduleAttachmentCleanup(): Promise<void> {
  const database = databaseConnection;
  if (!database) {
    return;
  }
  try {
    const rows = await database.db
      .select({ contentJson: pages.contentJson })
      .from(pages);
    const result = await cleanupOrphanAttachments({
      userDataDirectory: app.getPath("userData"),
      attachmentsDirectory: attachmentsDirectory(),
      readRows: async () => rows.map((row) => row.contentJson),
      now: Date.now(),
    });
    if (result && result.removed.length > 0) {
      console.log(
        `LifeOS removed ${result.removed.length} orphan attachment file(s)`,
      );
    }
  } catch (error) {
    console.warn("LifeOS attachment cleanup failed", error);
  }
}

/**
 * FR-2.6: trash entries whose deletion date is older than the retention
 * window disappear permanently on launch.
 */
function purgeExpiredPages(): void {
  const repository = pageRepository;
  if (!repository) {
    return;
  }
  try {
    const purged = repository.purgeExpiredTrash(Date.now());
    if (purged > 0) {
      console.log(
        `LifeOS purged ${purged} trash entry/entries past the retention window`,
      );
    }
  } catch (error) {
    console.warn("LifeOS trash purge failed", error);
  }
}

registerIpcHandler(
  "app:get-version",
  (args): args is [] => args.length === 0,
  validateIpcSender,
  () => app.getVersion(),
);

registerIpcHandler(
  "attachments:save",
  isSaveAttachmentArgs,
  validateIpcSender,
  (_event, input) =>
    saveAttachment(attachmentsDirectory(), input.mime, input.bytes),
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
  buildApplicationMenu();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(defaultWindowBounds);
    }
  });
  const restoreBounds = await readWindowBounds(app.getPath("userData"));
  createWindow(restoreBounds);
  void scheduleAttachmentCleanup();
  purgeExpiredPages();
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
