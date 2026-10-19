"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { runPageOperation } from "@/lib/pages-client";
import { createPageSaver, type PageSaver } from "@/lib/page-saver";
import { saveStatusStore } from "@/lib/editor-save-status";
import { useWorkspace } from "../workspace-provider";
import { createEditorExtensions } from "./extensions";
import { FloatingToolbar } from "./floating-toolbar";

type LoadStatus = "loading" | "ready" | "error";

/**
 * The FR-1 page editor. The editor instance lives for the lifetime of one
 * active page (the component is keyed by page id): switching pages flushes the
 * pending save, then loads the restored document into a fresh editor.
 */
export function PageDocEditor({ pageId }: { pageId: string }) {
  const { pushError } = useWorkspace();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [retryToken, setRetryToken] = useState(0);
  const [initialContent, setInitialContent] = useState<Record<string, unknown> | undefined>(
    undefined,
  );

  const editorRef = useRef<Editor | null>(null);
  const saverRef = useRef<PageSaver | null>(null);

  // The autosave engine (FR-3.2/FR-3.3). Kept out of render state so the
  // serialized save queue and its timers run exactly once per active page.
  useEffect(() => {
    const saver = createPageSaver({
      pageId,
      snapshot: () => {
        const currentEditor = editorRef.current;
        return currentEditor && !currentEditor.isDestroyed
          ? JSON.stringify(currentEditor.getJSON())
          : null;
      },
      savePage: async (id, contentJson) => {
        try {
          await runPageOperation("saveContent", (api) =>
            api.savePageContent({ pageId: id, contentJson }),
          );
        } catch (error) {
          pushError(
            error instanceof Error ? error.message : "The page could not be saved.",
          );
          throw error;
        }
      },
      onStateChange: (state) => {
        saveStatusStore.set(state);
      },
    });
    saverRef.current = saver;

    // The Retry button in the save indicator bumps a token; flush for it.
    let handledToken = saveStatusStore.getSnapshot().retryToken;
    const unsubscribe = saveStatusStore.subscribe(() => {
      const { retryToken: requested } = saveStatusStore.getSnapshot();
      if (requested > handledToken) {
        handledToken = requested;
        void saver.flush();
      }
    });

    return () => {
      unsubscribe();
      saverRef.current = null;
    };
  }, [pageId, pushError]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      setStatus("loading");
      try {
        const content = await runPageOperation("getPageContent", (api) =>
          api.getPageContent({ pageId }),
        );
        if (cancelled) {
          return;
        }
        saverRef.current?.setPersisted(content.contentJson);
        setInitialContent(JSON.parse(content.contentJson) as Record<string, unknown>);
        setStatus("ready");
      } catch {
        if (cancelled) {
          return;
        }
        setStatus("error");
        pushError("The page content could not be loaded.");
      }
    })();
    return () => {
      cancelled = true;
      // Switching away from the page: persist whatever is on screen.
      void saverRef.current?.flush();
    };
  }, [pageId, pushError, retryToken]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: createEditorExtensions(),
      content: initialContent,
      onUpdate: () => {
        saverRef.current?.schedule();
      },
      onBlur: () => {
        void saverRef.current?.flush();
      },
    },
    // Recreate only when a different page document is loaded.
    [initialContent],
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  if (status === "loading") {
    return <div className="page-doc-status">Loading…</div>;
  }

  if (status === "error") {
    return (
      <div className="page-doc-status page-doc-error">
        <p>The page content could not be loaded.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => setRetryToken((token) => token + 1)}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="page-doc">
      {editor ? (
        <>
          <FloatingToolbar editor={editor} />
          <DragHandle editor={editor} nested>
            <span className="drag-grip" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" role="presentation">
                <circle cx="6" cy="3" r="1.2" />
                <circle cx="10" cy="3" r="1.2" />
                <circle cx="6" cy="8" r="1.2" />
                <circle cx="10" cy="8" r="1.2" />
                <circle cx="6" cy="13" r="1.2" />
                <circle cx="10" cy="13" r="1.2" />
              </svg>
            </span>
          </DragHandle>
          <EditorContent editor={editor} className="page-doc-content" />
        </>
      ) : null}
    </div>
  );
}
