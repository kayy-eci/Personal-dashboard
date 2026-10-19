"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { runPageOperation } from "@/lib/pages-client";
import { useWorkspace } from "../workspace-provider";
import { createEditorExtensions } from "./extensions";
import { FloatingToolbar } from "./floating-toolbar";

const saveDebounceMs = 500;
const saveHardFlushMs = 5000;
const saveRetryMs = 250;

interface PageSaver {
  /** Marks the given document JSON as already persisted. */
  setPersisted: (contentJson: string) => void;
  /** Queues a debounced (or throttled) save after an edit. */
  schedule: () => void;
  /** Cancels the debounce and saves immediately. */
  flush: () => void;
}

/**
 * The persistence engine of one page editor. Plain closures (no React) so the
 * timers and in-flight guard behave exactly once per active page. The snapshot
 * callback reads the latest document synchronously, so flushing during
 * unmount/page switch still acts on the live content.
 */
function createPageSaver(
  pageId: string,
  onError: (message: string) => void,
  snapshot: () => string | null,
): PageSaver {
  let lastSavedJson = "";
  let lastSaveTime = 0;
  let saveTimer: number | null = null;
  let saving = false;

  function queue(ms: number): void {
    if (saveTimer !== null) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      void save();
    }, ms);
  }

  async function save(): Promise<void> {
    const contentJson = snapshot();
    if (!contentJson || contentJson === lastSavedJson) {
      return;
    }
    if (saving) {
      // Wait for the in-flight save, then try again with the latest snapshot.
      queue(saveRetryMs);
      return;
    }
    saving = true;
    try {
      await runPageOperation("saveContent", (api) =>
        api.savePageContent({ pageId, contentJson }),
      );
      lastSavedJson = contentJson;
      lastSaveTime = Date.now();
    } catch {
      onError("The page could not be saved. It will be retried on the next edit.");
    }
    saving = false;
    // Typing continued while the save was in flight; persist the newer state.
    const latest = snapshot();
    if (latest && latest !== lastSavedJson) {
      void save();
    }
  }

  return {
    setPersisted(contentJson) {
      lastSavedJson = contentJson;
      lastSaveTime = Date.now();
    },
    schedule() {
      const now = Date.now();
      // Continuous typing never starves persistence: force a save at most
      // this often while the user types.
      if (now - lastSaveTime >= saveHardFlushMs) {
        lastSaveTime = now;
        void save();
        return;
      }
      queue(saveDebounceMs);
    },
    flush() {
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
      }
      void save();
    },
  };
}

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

  useEffect(() => {
    saverRef.current = createPageSaver(
      pageId,
      (message) => pushError(message),
      () => {
        const currentEditor = editorRef.current;
        return currentEditor && !currentEditor.isDestroyed
          ? JSON.stringify(currentEditor.getJSON())
          : null;
      },
    );
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
      saverRef.current?.flush();
    };
  }, [pageId, retryToken, pushError]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: createEditorExtensions(),
      content: initialContent,
      onUpdate: () => {
        saverRef.current?.schedule();
      },
      onBlur: () => {
        saverRef.current?.flush();
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
