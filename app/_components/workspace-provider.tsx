"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  PageIdInput,
  PageRecord,
  PageTrashEntry,
  PageTreeNode,
} from "@/lib/pages-client";
import { getLifeOsApi, runPageOperation } from "@/lib/pages-client";
import { flushActiveSaver } from "@/lib/page-saver";
import { ancestorsOf, findNode, isForbiddenMoveParent } from "@/lib/page-tree";
import {
  isThemePreference,
  nextTheme,
  type ThemePreference,
} from "@/lib/theme-preference";
import {
  isFiniteNumber,
  isStringArray,
  readUiJson,
  readUiString,
  writeUiJson,
  writeUiString,
} from "@/lib/ui-prefs";

export const sidebarMinWidth = 200;
export const sidebarMaxWidth = 480;

const themeKey = "theme";

export type DropZone = "before" | "after" | "inside";

export interface MoveRequest {
  pageId: string;
  parentId: string | null;
  beforeId?: string;
  afterId?: string;
}

export interface WorkspaceActions {
  tree: PageTreeNode[] | null;
  treeError: string | null;
  activePageId: string | null;
  expandedIds: ReadonlySet<string>;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  trashOpen: boolean;
  isTrashLoading: boolean;
  trashEntries: PageTrashEntry[];
  pageTitleFocusToken: number;
  errors: readonly string[];
  draggingPageId: string | null;
  hoveredRowId: string | null;
  theme: ThemePreference;
  cycleTheme: () => void;
  shortcutsOpen: boolean;
  closeShortcuts: () => void;
  selectPage: (pageId: string) => void;
  toggleExpanded: (pageId: string) => void;
  createPage: (options?: { parentId?: string | null }) => Promise<void>;
  renamePage: (pageId: string, title: string) => Promise<boolean>;
  setPageIcon: (pageId: string, icon: string | null) => Promise<boolean>;
  setPageCover: (pageId: string, cover: string | null) => Promise<boolean>;
  movePage: (request: MoveRequest) => Promise<boolean>;
  deletePage: (pageId: string) => Promise<void>;
  restorePage: (pageId: string) => Promise<void>;
  purgePage: (pageId: string) => Promise<void>;
  openTrash: () => void;
  closeTrash: () => void;
  refreshTrash: () => Promise<void>;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  retryLoadTree: () => void;
  dismissError: (message: string) => void;
  pushError: (message: string) => void;
  startDrag: (pageId: string) => void;
  setHoveredRow: (pageId: string | null) => void;
  endDrag: () => void;
}

const WorkspaceContext = createContext<WorkspaceActions | null>(null);

export function useWorkspace(): WorkspaceActions {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("Workspace components must be used inside WorkspaceProvider");
  }
  return context;
}

function sameLocation(
  tree: readonly PageTreeNode[],
  request: MoveRequest,
): boolean {
  const node = findNode(tree, request.pageId);
  if (!node) {
    return false;
  }
  if (node.parentId !== request.parentId) {
    return false;
  }
  if (request.beforeId !== undefined) {
    const siblings = siblingsOf(tree, node.parentId);
    const index = siblings.findIndex(({ id }) => id === node.id);
    return siblings[index - 1]?.id === request.beforeId;
  }
  if (request.afterId !== undefined) {
    const siblings = siblingsOf(tree, node.parentId);
    const index = siblings.findIndex(({ id }) => id === node.id);
    return siblings[index + 1]?.id === request.afterId;
  }
  // Append into the same parent is a no-op only when the node is already last.
  const siblings = siblingsOf(tree, node.parentId);
  return siblings[siblings.length - 1]?.id === node.id;
}

function siblingsOf(
  tree: readonly PageTreeNode[],
  parentId: string | null,
): readonly PageTreeNode[] {
  if (parentId === null) {
    return tree;
  }
  return findNode(tree, parentId)?.children ?? [];
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [tree, setTree] = useState<PageTreeNode[] | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const [sidebarWidth, setSidebarWidthState] = useState(280);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashEntries, setTrashEntries] = useState<PageTrashEntry[]>([]);
  const [isTrashLoading, setIsTrashLoading] = useState(false);
  const [pageTitleFocusToken, setPageTitleFocusToken] = useState(0);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const treeRef = useRef<PageTreeNode[] | null>(null);
  useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  const pushError = useCallback((message: string) => {
    setErrors((current) =>
      current.includes(message) ? current : [...current, message],
    );
  }, []);

  const dismissError = useCallback((message: string) => {
    setErrors((current) => current.filter((entry) => entry !== message));
  }, []);

  const loadTree = useCallback(async () => {
    try {
      const loaded = await runPageOperation("listTree", (api) => api.listPageTree());
      setTree(loaded);
      setTreeError(null);
      return loaded;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The page list could not be loaded";
      setTreeError(message);
      pushError(message);
      return null;
    }
  }, [pushError]);

  /** FR-4.4: resolves the preference against the OS scheme and applies it. */
  const applyTheme = useCallback((preference: ThemePreference) => {
    const root = document.documentElement;
    const dark =
      preference === "dark" ||
      (preference === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) {
      root.dataset.theme = "dark";
    } else {
      delete root.dataset.theme;
    }
  }, []);

  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const cycleTheme = useCallback(() => {
    const next = nextTheme(themeRef.current);
    writeUiString(themeKey, next);
    setTheme(next);
    applyTheme(next);
  }, [applyTheme]);

  // Follow OS scheme changes while "system" is selected.
  useEffect(() => {
    if (theme !== "system") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, applyTheme]);

  // Initial load plus persisted UI state.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      // Apply persisted UI preferences before the first data load. These run
      // after hydration so the first client render matches the static export.
      const expanded = readUiJson("sidebar.expandedPages", isStringArray);
      if (expanded) {
        setExpandedIds(new Set(expanded));
      }
      const width = readUiJson("sidebar.width", isFiniteNumber);
      if (width && width >= sidebarMinWidth && width <= sidebarMaxWidth) {
        setSidebarWidthState(width);
      }
      if (readUiString("sidebar.collapsed") === "true") {
        setSidebarCollapsed(true);
      }
      const storedTheme = readUiString(themeKey);
      const themePreference = isThemePreference(storedTheme)
        ? storedTheme
        : "system";
      setTheme(themePreference);
      applyTheme(themePreference);
      setActivePageId(readUiString("sidebar.activePageId") ?? null);

      const loaded = await loadTree();
      if (!loaded || cancelled) {
        return;
      }
      // Restore the last opened page if it still exists; otherwise fall back
      // to the first page so the app never opens fully empty.
      const preferred = readUiString("sidebar.activePageId");
      if (preferred && findNode(loaded, preferred)) {
        return;
      }
      const first = loaded[0]?.id;
      if (first) {
        writeUiString("sidebar.activePageId", first);
        setActivePageId(first);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadTree, applyTheme]);

  // Keep ancestors of the active page expanded so the selection is visible.
  useEffect(() => {
    const loaded = treeRef.current;
    if (!loaded || !activePageId) {
      return;
    }
    const needed = ancestorsOf(loaded, activePageId);
    setExpandedIds((current) => {
      if (needed.every((id) => current.has(id))) {
        return current;
      }
      const next = new Set(current);
      needed.forEach((id) => next.add(id));
      return next;
    });
  }, [activePageId, tree]);

  // Persist UI preferences.
  useEffect(() => {
    writeUiJson("sidebar.expandedPages", [...expandedIds]);
  }, [expandedIds]);
  useEffect(() => {
    writeUiString("sidebar.activePageId", activePageId);
  }, [activePageId]);
  useEffect(() => {
    writeUiJson("sidebar.width", sidebarWidth);
  }, [sidebarWidth]);
  useEffect(() => {
    writeUiString("sidebar.collapsed", sidebarCollapsed ? "true" : "false");
  }, [sidebarCollapsed]);

  const setSidebarWidth = useCallback((width: number) => {
    setSidebarWidthState(
      Math.min(sidebarMaxWidth, Math.max(sidebarMinWidth, Math.round(width))),
    );
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => !current);
  }, []);

  const requestTitleFocus = useCallback(() => {
    setPageTitleFocusToken((token) => token + 1);
  }, []);

  const selectPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
  }, []);

  const toggleExpanded = useCallback((pageId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const refreshTrash = useCallback(async () => {
    setIsTrashLoading(true);
    try {
      const entries = await runPageOperation("listTrash", (api) => api.listTrash());
      setTrashEntries(entries);
    } catch (error) {
      pushError(error instanceof Error ? error.message : "The trash could not be loaded");
    } finally {
      setIsTrashLoading(false);
    }
  }, [pushError]);

  const openTrash = useCallback(() => {
    setTrashOpen(true);
    void refreshTrash();
  }, [refreshTrash]);

  const closeTrash = useCallback(() => {
    setTrashOpen(false);
  }, []);

  const closeShortcuts = useCallback(() => {
    setShortcutsOpen(false);
  }, []);

  const createPage = useCallback(
    async (options?: { parentId?: string | null }) => {
      const parentId = options?.parentId;
      try {
        const created: PageRecord = await runPageOperation("create", (api) =>
          api.createPage(parentId === undefined ? {} : { parentId: parentId ?? null }),
        );
        if (parentId) {
          setExpandedIds((current) => new Set(current).add(parentId));
        }
        setActivePageId(created.id);
        requestTitleFocus();
        const loaded = await loadTree();
        if (loaded && !findNode(loaded, created.id)) {
          // The tree did not include the new page; retry once.
          void loadTree();
        }
      } catch (error) {
        pushError(error instanceof Error ? error.message : "The page could not be created");
      }
    },
    [loadTree, pushError, requestTitleFocus],
  );

  const renamePage = useCallback(
    async (pageId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        pushError("A page title cannot be empty.");
        return false;
      }
      try {
        await runPageOperation("rename", (api) =>
          api.renamePage({ pageId, title: trimmed }),
        );
        await loadTree();
        return true;
      } catch (error) {
        pushError(
          error instanceof Error ? error.message : "The page could not be renamed",
        );
        return false;
      }
    },
    [loadTree, pushError],
  );

  const setPageIcon = useCallback(
    async (pageId: string, icon: string | null) => {
      try {
        await runPageOperation("setPageIcon", (api) =>
          api.savePageIcon({ pageId, icon }),
        );
        await loadTree();
        return true;
      } catch (error) {
        pushError(
          error instanceof Error ? error.message : "The page icon could not be updated",
        );
        return false;
      }
    },
    [loadTree, pushError],
  );

  const setPageCover = useCallback(
    async (pageId: string, cover: string | null) => {
      try {
        await runPageOperation("setPageCover", (api) =>
          api.savePageCover({ pageId, cover }),
        );
        await loadTree();
        return true;
      } catch (error) {
        pushError(
          error instanceof Error ? error.message : "The page cover could not be updated",
        );
        return false;
      }
    },
    [loadTree, pushError],
  );

  const movePageRaw = useCallback(
    async (request: MoveRequest) => {
      try {
        await runPageOperation("move", (api) =>
          api.movePage({
            pageId: request.pageId,
            parentId: request.parentId,
            beforeId: request.beforeId,
            afterId: request.afterId,
          }),
        );
        // Make the moved page visible in its new location.
        const targetParent = request.parentId;
        if (targetParent) {
          setExpandedIds((current) => new Set(current).add(targetParent));
        }
        await loadTree();
        return true;
      } catch (error) {
        pushError(error instanceof Error ? error.message : "The page could not be moved");
        await loadTree();
        return false;
      }
    },
    [loadTree, pushError],
  );

  const movePage = useCallback(
    async (request: MoveRequest) => {
      const loaded = treeRef.current;
      if (!loaded) {
        return false;
      }
      if (sameLocation(loaded, request)) {
        return true;
      }
      if (isForbiddenMoveParent(loaded, request.pageId, request.parentId)) {
        pushError("A page cannot be moved into itself or one of its sub-pages.");
        return false;
      }
      return movePageRaw(request);
    },
    [movePageRaw, pushError],
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      const loaded = treeRef.current;
      const deletedNode = loaded ? findNode(loaded, pageId) : undefined;
      if (!loaded || !deletedNode) {
        pushError("The page could not be found in the current tree.");
        return;
      }
      try {
        const input: PageIdInput = { pageId };
        await runPageOperation("delete", (api) => api.deletePage(input));
        // If the active page sits inside the deleted subtree, move the
        // selection to the nearest surviving page (the deleted page's parent).
        const activePath = findNode(loaded, activePageId ?? "")
          ? ancestorsOf(loaded, activePageId ?? pageId)
          : [];
        if (activePageId && (pageId === activePageId || activePath.includes(pageId))) {
          setActivePageId(deletedNode.parentId);
        }
        await loadTree();
        if (trashOpen) {
          await refreshTrash();
        }
      } catch (error) {
        pushError(
          error instanceof Error
            ? error.message
            : "The page could not be moved to the trash",
        );
      }
    },
    [activePageId, loadTree, pushError, refreshTrash, trashOpen],
  );

  const restorePage = useCallback(
    async (pageId: string) => {
      try {
        const restored: PageRecord = await runPageOperation("restore", (api) =>
          api.restorePage({ pageId }),
        );
        const loaded = await loadTree();
        if (loaded) {
          const needed = restored.parentId
            ? ancestorsOf(loaded, restored.parentId)
            : [];
          setExpandedIds((current) => {
            const next = new Set(current);
            needed.forEach((id) => next.add(id));
            return next;
          });
        }
        await refreshTrash();
      } catch (error) {
        pushError(
          error instanceof Error ? error.message : "The page could not be restored",
        );
      }
    },
    [loadTree, pushError, refreshTrash],
  );

  // FR-2.6: permanent deletion. The dialog confirms before calling this.
  const purgePage = useCallback(
    async (pageId: string) => {
      try {
        await runPageOperation("purge", (api) => api.purgePage({ pageId }));
        await loadTree();
        if (trashOpen) {
          await refreshTrash();
        }
      } catch (error) {
        pushError(
          error instanceof Error
            ? error.message
            : "The page could not be deleted permanently",
        );
      }
    },
    [loadTree, pushError, refreshTrash, trashOpen],
  );

  const retryLoadTree = useCallback(() => {
    void loadTree();
  }, [loadTree]);

  const startDrag = useCallback((pageId: string) => {
    setDraggingPageId(pageId);
    setHoveredRowId(null);
  }, []);

  const setHoveredRow = useCallback((pageId: string | null) => {
    setHoveredRowId(pageId);
  }, []);

  const endDrag = useCallback(() => {
    setDraggingPageId(null);
    setHoveredRowId(null);
  }, []);

  // FR-4.3: native menu accelerators (New page, Toggle sidebar, Toggle theme,
  // Shortcut cheat sheet) arrive over the typed "app:menu-action" channel; the
  // menu is authoritative, so no renderer-side keydown duplicates them.
  useEffect(() => {
    const api = getLifeOsApi();
    if (!api?.onMenuAction) {
      return;
    }
    return api.onMenuAction((action) => {
      switch (action) {
        case "new-page":
          void createPage();
          requestTitleFocus();
          break;
        case "toggle-sidebar":
          toggleSidebar();
          break;
        case "toggle-theme":
          cycleTheme();
          break;
        case "show-shortcuts":
          setShortcutsOpen(true);
          break;
      }
    });
  }, [createPage, cycleTheme, requestTitleFocus, toggleSidebar]);

  // FR-3.2: the main process asks for a flush on window close and quit; the
  // active page saver does the work and this shell always answers the shell
  // handshake (also when no page editor is mounted).
  useEffect(() => {
    const api = getLifeOsApi();
    if (!api?.onRequestFlush) {
      return;
    }
    return api.onRequestFlush(() => {
      void (async () => {
        try {
          await flushActiveSaver();
        } finally {
          api.signalFlushDone();
        }
      })();
    });
  }, []);

  const value = useMemo<WorkspaceActions>(
    () => ({
      tree,
      treeError,
      activePageId,
      expandedIds,
      sidebarWidth,
      sidebarCollapsed,
      trashOpen,
      isTrashLoading,
      trashEntries,
      pageTitleFocusToken,
      errors,
      draggingPageId,
      hoveredRowId,
      theme,
      cycleTheme,
      shortcutsOpen,
      closeShortcuts,
      selectPage,
      toggleExpanded,
      createPage,
      renamePage,

      setPageIcon,
      setPageCover,
      movePage,
      deletePage,
      restorePage,
      purgePage,
      openTrash,
      closeTrash,
      refreshTrash,
      setSidebarWidth,
      toggleSidebar,
      retryLoadTree,
      dismissError,
      pushError,
      startDrag,
      setHoveredRow,
      endDrag,
    }),
    [
      tree,
      treeError,
      activePageId,
      expandedIds,
      sidebarWidth,
      sidebarCollapsed,
      trashOpen,
      isTrashLoading,
      trashEntries,
      pageTitleFocusToken,
      errors,
      draggingPageId,
      hoveredRowId,
      theme,
      cycleTheme,
      shortcutsOpen,
      closeShortcuts,
      selectPage,
      toggleExpanded,
      createPage,
      renamePage,

      setPageIcon,
      setPageCover,
      movePage,
      deletePage,
      restorePage,
      purgePage,
      openTrash,
      closeTrash,
      refreshTrash,
      setSidebarWidth,
      toggleSidebar,
      retryLoadTree,
      dismissError,
      pushError,
      startDrag,
      setHoveredRow,
      endDrag,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
