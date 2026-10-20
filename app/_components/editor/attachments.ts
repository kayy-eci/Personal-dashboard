import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import {
  ATTACHMENT_MAX_BYTES,
  attachmentErrorMessage,
  imageTooLargeMessage,
} from "@/lib/attachment-limits";

export type AttachmentErrorHandler = (message: string) => void;

/**
 * FR-1.9: pasted or dropped images are stored as local attachment files
 * (SHA-256 names via the attachments IPC) and never inlined as base64.
 * The main process reads the image type from the bytes, so the file name or
 * the browser-declared MIME can never decide how the bytes are served.
 */
export async function saveAndInsertImage(
  editor: import("@tiptap/core").Editor,
  file: File,
  onError?: AttachmentErrorHandler,
): Promise<boolean> {
  const api = window.lifeos;
  if (!api) {
    return false;
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    onError?.(imageTooLargeMessage(ATTACHMENT_MAX_BYTES));
    return false;
  }
  try {
    const bytes = await file.arrayBuffer();
    const stored = await api.saveAttachment({ bytes });
    editor
      .chain()
      .focus()
      .setImage({ src: stored.urlPath, alt: file.name })
      .run();
    return true;
  } catch (error) {
    onError?.(attachmentErrorMessage(error));
    return false;
  }
}

export interface ImagePasteOptions {
  onError: AttachmentErrorHandler | null;
}

export const ImagePaste = Extension.create<ImagePasteOptions>({
  name: "imagePaste",

  addOptions() {
    return { onError: null };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const onError = this.options.onError ?? undefined;

    const handleFiles = (files: readonly File[]): boolean => {
      if (files.length === 0) {
        return false;
      }
      for (const file of files) {
        void saveAndInsertImage(editor, file, onError);
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
