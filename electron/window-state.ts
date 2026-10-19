import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * FR-4.2: persisted window bounds. Stored as plain JSON in the OS user-data
 * directory; every value is validated on load so a corrupt file falls back to
 * defaults instead of crashing the shell.
 */

export interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

export const windowMinWidth = 800;
export const windowMinHeight = 560;

const defaultWindowBounds: WindowBounds = { width: 1120, height: 760 };
const fileName = "window-state.json";
const coordinateLimit = 20000;
const sizeLimit = 10000;

function isCoordinate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= coordinateLimit
  );
}

export function sanitizeWindowBounds(raw: unknown): WindowBounds | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (
    typeof candidate.width !== "number" ||
    !Number.isFinite(candidate.width) ||
    candidate.width < windowMinWidth ||
    candidate.width > sizeLimit ||
    typeof candidate.height !== "number" ||
    !Number.isFinite(candidate.height) ||
    candidate.height < windowMinHeight ||
    candidate.height > sizeLimit
  ) {
    return null;
  }
  const bounds: WindowBounds = {
    width: Math.round(candidate.width),
    height: Math.round(candidate.height),
  };
  if (isCoordinate(candidate.x) && isCoordinate(candidate.y)) {
    bounds.x = Math.round(candidate.x);
    bounds.y = Math.round(candidate.y);
  }
  if (candidate.maximized === true) {
    bounds.maximized = true;
  }
  return bounds;
}

export async function readWindowBounds(
  userDataDirectory: string,
): Promise<WindowBounds> {
  try {
    const raw: unknown = JSON.parse(
      await readFile(join(userDataDirectory, fileName), "utf8"),
    );
    return sanitizeWindowBounds(raw) ?? defaultWindowBounds;
  } catch {
    return defaultWindowBounds;
  }
}

export async function writeWindowBounds(
  userDataDirectory: string,
  bounds: WindowBounds,
): Promise<void> {
  await mkdir(userDataDirectory, { recursive: true });
  await writeFile(
    join(userDataDirectory, fileName),
    `${JSON.stringify(bounds)}\n`,
    "utf8",
  );
}
