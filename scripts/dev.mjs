import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const electronBinary = require("electron");
const children = [];

function isPortAvailable(port) {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", (error) => {
      if ("code" in error && error.code === "EADDRINUSE") {
        resolve(false);
      } else {
        reject(error);
      }
    });
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => (error ? reject(error) : resolve(true)));
    });
  });
}

async function findAvailablePort() {
  for (let port = 3000; port <= 3010; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error("No free development port found between 3000 and 3010");
}

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  children.push(child);
  child.once("error", (error) => {
    console.error(`Failed to start ${command}:`, error);
  });
  return child;
}

function stopChildren() {
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill();
    }
  }
}

async function waitForRenderer(child, rendererUrl) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js dev server exited with code ${child.exitCode}`);
    }

    try {
      const response = await fetch(rendererUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Connection refusal is expected while the renderer starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Next.js did not become ready at ${rendererUrl}`);
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

process.on("SIGINT", stopChildren);
process.on("SIGTERM", stopChildren);

try {
  const rendererPort = await findAvailablePort();
  const rendererUrl = `http://127.0.0.1:${rendererPort}`;
  const build = start(process.execPath, [
    resolve(root, "node_modules/typescript/bin/tsc"),
    "--project",
    "tsconfig.electron.json",
  ]);
  const buildExitCode = await waitForExit(build);
  if (buildExitCode !== 0) {
    throw new Error(`Electron TypeScript build failed with code ${buildExitCode}`);
  }

  const renderer = start(
    process.execPath,
    [
      resolve(root, "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(rendererPort),
    ],
    { env: { ...process.env, LIFEOS_NEXT_DIST_DIR: ".next-lifeos-dev" } },
  );
  await waitForRenderer(renderer, rendererUrl);

  const electron = start(electronBinary, ["."], {
    env: { ...process.env, LIFEOS_DEV_SERVER_URL: rendererUrl },
  });
  process.exitCode = await waitForExit(electron);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  stopChildren();
}
