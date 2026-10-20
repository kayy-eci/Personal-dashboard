/** Shared image attachment limits used by the renderer and the main process. */

export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const ICON_MAX_BYTES = 5 * 1024 * 1024;

/** File picker filter for every place an image can be chosen. */
export const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,image/avif";

export const IMAGE_FORMATS_LABEL = "PNG, JPG, GIF, WebP or AVIF";

export function imageTooLargeMessage(maxBytes: number): string {
  return `This image is too large. The maximum size is ${
    maxBytes / (1024 * 1024)
  } MB.`;
}

export function unsupportedImageMessage(): string {
  return `This image format is not supported. Use ${IMAGE_FORMATS_LABEL}.`;
}

/** Turns an IPC attachment error into a message a person can act on. */
export function attachmentErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/format is not supported|type is not supported/i.test(message)) {
    return unsupportedImageMessage();
  }
  if (/too large|size is not allowed|Invalid IPC arguments/i.test(message)) {
    return imageTooLargeMessage(ATTACHMENT_MAX_BYTES);
  }
  if (/empty/i.test(message)) {
    return "The image file is empty.";
  }
  return "The image could not be saved.";
}
