"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { runPageOperation } from "@/lib/pages-client";
import { createPageSaver, setActiveSaver, type PageSaver } from "@/lib/page-saver";
import { saveStatusStore } from "@/lib/editor-save-status";
import { useWorkspace } from "../workspace-provider";
import { createEditorExtensions } from "./extensions";
import { FloatingToolbar } from "./floating-toolbar";
import { BlockMenu, findTopLevelBlockAtY, type BlockMenuState } from "./block-menu";

type LoadStatus = "loading" | "ready" | "error";

/**
 * The FR-1 page editor. The editor instance lives for the lifetime of one
 * active page (the component is keyed by page id): switching pages flushes the
 * pending save, then loads the restored document into a fresh editor.
 */
export function PageDocEditor({ pageId }: { pageId: string }) {
  const { pushError, createPage } = useWorkspace();
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
    setActiveSaver(saver);

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
      setActiveSaver(null);
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

  // FR-2.3: the slash menu can create a sub-page under the current page; the
  // page created from slash menu opens right away via createPage.
  const handleCreateSubPage = useCallback(() => {
    void createPage({ parentId: pageId });
  }, [createPage, pageId]);

  // FR-1.7: clicking the drag grip opens the block menu for that block.
  const [blockMenu, setBlockMenu] = useState<BlockMenuState | null>(null);
  const openBlockMenu = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const currentEditor = editorRef.current;
      if (!currentEditor) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const block = findTopLevelBlockAtY(currentEditor, centerY);
      if (!block) {
        return;
      }
      event.preventDefault();
      // Anchor at the grip column so the menu opens at the handle, Notion-like.
      setBlockMenu({
        x: rect.left,
        y: rect.top,
        node: block.node,
        from: block.from,
        to: block.to,
      });
    },
    [],
  );
  const closeBlockMenu = useCallback(() => {
    setBlockMenu(null);
    // Return focus so keyboard editing continues after Escape/click-away.
    editorRef.current?.view.focus();
  }, []);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: createEditorExtensions({
        onCreateSubPage: handleCreateSubPage,
      }),
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
            <span
              className="drag-grip"
              role="button"
              aria-label="Block actions"
              title="Drag to move; click for block actions"
              onClick={openBlockMenu}
              onContextMenu={openBlockMenu}
            >
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
          {blockMenu && editor.isEditable ? (
            // A distinct key per open remounts the component so it always
            // starts back on the main panel.
            <BlockMenu
              key={`${blockMenu.from}@${blockMenu.y}`}
              editor={editor}
              menu={blockMenu}
              onClose={closeBlockMenu}
            />
          ) : null}
          <EditorContent editor={editor} className="page-doc-content" />
        </>
      ) : null}
    </div>
  );
}
