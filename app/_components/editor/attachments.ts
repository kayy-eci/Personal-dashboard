import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const supportedImageMimes = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

export function isSupportedImageFile(file: File): boolean {
  return supportedImageMimes.has(file.type.toLowerCase());
}

/**
 * FR-1.9: pasted or dropped images are stored as local attachment files
 * (SHA-256 names via the attachments IPC) and never inlined as base64.
 */
export async function saveAndInsertImage(
  editor: import("@tiptap/core").Editor,
  file: File,
): Promise<boolean> {
  const api = window.lifeos;
  if (!api) {
    return false;
  }
  try {
    const bytes = await file.arrayBuffer();
    const stored = await api.saveAttachment({ mime: file.type, bytes });
    editor
      .chain()
      .focus()
      .setImage({ src: stored.urlPath, alt: file.name })
      .run();
    return true;
  } catch {
    console.error("LifeOS could not save the attached image");
    return false;
  }
}

export const ImagePaste = Extension.create({
  name: "imagePaste",

  addProseMirrorPlugins() {
    const editor = this.editor;

    const handleFiles = (files: readonly File[]): boolean => {
      const images = files.filter(isSupportedImageFile);
      if (images.length === 0) {
        return false;
      }
      for (const image of images) {
        void saveAndInsertImage(editor, image);
      }
      return true;
    };

    return [
      new Plugin({
        props: {
          handlePaste: (_view: EditorView, event: ClipboardEvent) => {
            const files = Array.from(event.clipboardData?.files ?? []);
            if (!handleFiles(files)) {
              return false;
            }
            event.preventDefault();
            return true;
          },
          handleDrop: (
            _view: EditorView,
            event: DragEvent,
            _slice,
            moved,
          ) => {
            if (moved) {
              return false;
            }
            const files = Array.from(event.dataTransfer?.files ?? []);
            if (!handleFiles(files)) {
              return false;
            }
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});
