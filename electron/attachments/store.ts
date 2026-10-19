import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface StoredAttachment {
  /** Content-addressed file name: <sha256>.<ext>. */
  fileName: string;
  /** URL path served by the lifeos://app/ scheme. */
  urlPath: string;
}

export type AttachmentFileName = `${string}.${string}`;

/** Only raster images are accepted; SVG is rejected as it can carry script. */
const extensionByMime: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

const mimeByExtension: Readonly<Record<string, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

export const attachmentFileNamePattern =
  /^([0-9a-f]{64})\.(png|jpg|jpeg|gif|webp|avif)$/;

export function isSupportedImageMime(value: unknown): value is string {
  return typeof value === "string" && value.toLowerCase() in extensionByMime;
}

export function getMimeForAttachmentFileName(
  fileName: string,
): string | undefined {
  const extension = fileName.split(".").pop() ?? "";
  return mimeByExtension[extension];
}

/** Saves the bytes content-addressed (SHA-256 file name) and returns its path. */
export async function saveAttachment(
  attachmentsDirectory: string,
  mime: string,
  bytes: ArrayBuffer,
): Promise<StoredAttachment> {
  if (!isSupportedImageMime(mime)) {
    throw new Error("The attachment type is not supported");
  }
  if (bytes.byteLength === 0 || bytes.byteLength > ATTACHMENT_MAX_BYTES) {
    throw new Error("The attachment size is not allowed");
  }

  const content = new Uint8Array(bytes);
  const hash = createHash("sha256").update(content).digest("hex");
  const fileName = `${hash}.${extensionByMime[mime.toLowerCase()]}`;

  await mkdir(attachmentsDirectory, { recursive: true });
  await writeFile(join(attachmentsDirectory, fileName), content);

  return { fileName, urlPath: `/attachment/${fileName}` };
}
