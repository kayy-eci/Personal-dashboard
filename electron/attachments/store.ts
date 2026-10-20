import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ATTACHMENT_MAX_BYTES,
  imageTooLargeMessage,
  unsupportedImageMessage,
} from "../../lib/attachment-limits";

export interface StoredAttachment {
  /** Content-addressed file name: <sha256>.<ext>. */
  fileName: string;
  /** URL path served by the lifeos://app/ scheme. */
  urlPath: string;
}

export type AttachmentFileName = `${string}.${string}`;

/**
 * Only raster images are accepted; SVG is rejected as it can carry script.
 * The type is always read from the bytes, never from a file extension or a
 * renderer-supplied MIME string.
 */
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

export { ATTACHMENT_MAX_BYTES };

export const attachmentFileNamePattern =
  /^([0-9a-f]{64})\.(png|jpg|jpeg|gif|webp|avif)$/;

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) {
    return false;
  }
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) {
      return false;
    }
  }
  return true;
}

/**
 * Detects a supported raster image from its magic bytes. Returns the MIME
 * type, or undefined for anything else (including SVG and text renamed .gif).
 */
export function detectImageMime(bytes: Uint8Array): string | undefined {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (asciiAt(bytes, 0, "GIF87a") || asciiAt(bytes, 0, "GIF89a")) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    asciiAt(bytes, 0, "RIFF") &&
    asciiAt(bytes, 8, "WEBP")
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 12 &&
    asciiAt(bytes, 4, "ftyp") &&
    (asciiAt(bytes, 8, "avif") || asciiAt(bytes, 8, "avis"))
  ) {
    return "image/avif";
  }
  return undefined;
}

export function getMimeForAttachmentFileName(
  fileName: string,
): string | undefined {
  const extension = fileName.split(".").pop() ?? "";
  return mimeByExtension[extension];
}

/**
 * Saves the original bytes content-addressed (SHA-256 file name) and returns
 * its path. GIFs are written untouched so animation survives.
 */
export async function saveAttachment(
  attachmentsDirectory: string,
  bytes: ArrayBuffer,
): Promise<StoredAttachment> {
  if (bytes.byteLength === 0) {
    throw new Error("The image file is empty");
  }
  if (bytes.byteLength > ATTACHMENT_MAX_BYTES) {
    throw new Error(imageTooLargeMessage(ATTACHMENT_MAX_BYTES));
  }

  const content = new Uint8Array(bytes);
  const mime = detectImageMime(content);
  if (!mime) {
    throw new Error(unsupportedImageMessage());
  }

  const hash = createHash("sha256").update(content).digest("hex");
  const fileName = `${hash}.${extensionByMime[mime]}`;

  await mkdir(attachmentsDirectory, { recursive: true });
  await writeFile(join(attachmentsDirectory, fileName), content);

  return { fileName, urlPath: `/attachment/${fileName}` };
}
