"use client";

import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { PageTreeNode } from "@/lib/pages-client";
import type { ThemePreference } from "@/lib/theme-preference";
import { isForbiddenMoveParent } from "@/lib/page-tree";
import {
  useWorkspace,
  type DropZone,
  type MoveRequest,
} from "./workspace-provider";
import {
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FileIcon,
  MoreIcon,
  PlusIcon,
  ThemeIcon,
  TrashIcon,
} from "./icons";

const pageIdDragType = "application/x-lifeos-page-id";

const themeLabels: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

function zoneForPointer(target: HTMLElement, clientY: number): DropZone {
  const rect = target.getBoundingClientRect();
  const offset = (clientY - rect.top) / rect.height;
  if (offset < 0.28) {
    return "before";
  }
  if (offset > 0.72) {
    return "after";
  }
  return "inside";
}

export function Sidebar() {
  const workspace = useWorkspace();
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ startWidth: number; startX: number } | null>(null);
  const themeLabel = themeLabels[workspace.theme];

  useEffect(() => {
    if (!isResizing) {
      return;
    }
    const onPointerMove = (event: PointerEvent) => {
      const start = resizeStartRef.current;
      if (!start) {
        return;
      }
      workspace.setSidebarWidth(start.startWidth + event.clientX - start.startX);
    };
    const onPointerUp = () => {
      resizeStartRef.current = null;
      setIsResizing(false);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isResizing, workspace]);

  if (workspace.sidebarCollapsed) {
    return (
      <nav className="sidebar-rail" aria-label="Workspace">
        <button
          type="button"
          className="icon-button"
          title="Open sidebar (Ctrl/Cmd+Shift+B)"
          aria-label="Open sidebar"
          onClick={workspace.toggleSidebar}
        >
          <ChevronsRightIcon />
        </button>
      </nav>
    );
  }

  const onResizerPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStartRef.current = {
      startWidth: workspace.sidebarWidth,
      startX: event.clientX,
    };
    setIsResizing(true);
  };

  return (
    <nav
      className="sidebar"
      style={{ width: workspace.sidebarWidth }}
      aria-label="Workspace"
    >
      <div className="sidebar-header">
        <span className="sidebar-title">LifeOS</span>
        <button
          type="button"
          className="icon-button"
          title="Collapse sidebar (Ctrl/Cmd+Shift+B)"
          aria-label="Collapse sidebar"
          onClick={workspace.toggleSidebar}
        >
          <ChevronsLeftIcon />
        </button>
      </div>

      <div className="sidebar-actions">
        <button
          type="button"
          className="sidebar-button"
          onClick={() => void workspace.createPage()}
        >
          <PlusIcon />
          <span>New page</span>
        </button>
      </div>

      <div className="sidebar-scroll">
        <SidebarTreeSection />
      </div>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-button" onClick={workspace.openTrash}>
          <TrashIcon />
          <span>Trash</span>
        </button>
        <button
          type="button"
          className="sidebar-button"
          onClick={workspace.cycleTheme}
          aria-label={`Theme: ${themeLabel}. Activates to switch to the next theme.`}
        >
          <ThemeIcon />
          <span>Theme: {themeLabel}</span>
        </button>
      </div>

      <div
        className="sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar between 200 and 480 pixels"
        onPointerDown={onResizerPointerDown}
      />
    </nav>
  );
}

function SidebarTreeSection() {
  const workspace = useWorkspace();
  const [rootDropActive, setRootDropActive] = useState(false);

  if (workspace.treeError) {
    return (
      <div className="sidebar-empty">
        <p>{workspace.treeError}</p>
        <button
          type="button"
          className="secondary-button"
          onClick={workspace.retryLoadTree}
        >
          Retry
        </button>
      </div>
    );
  }

  if (workspace.tree === null) {
    return <div className="sidebar-empty">Loading pages…</div>;
  }

  if (workspace.tree.length === 0) {
    return (
      <div className="sidebar-empty">
        <p>No pages yet.</p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void workspace.createPage()}
        >
          Create your first page
        </button>
      </div>
    );
  }

  const isDragging = workspace.draggingPageId !== null;

  return (
    <div
      className="sidebar-tree-root"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const isOnRow = (event.target as HTMLElement).closest?.(".tree-row");
        setRootDropActive(!isOnRow);
        if (!isOnRow) {
          workspace.setHoveredRow(null);
        }
      }}
      onDrop={(event) => {
        setRootDropActive(false);
        const pageId = event.dataTransfer.getData(pageIdDragType);
        if (!pageId || !isDragging) {
          return;
        }
        event.preventDefault();
        void workspace.movePage({ pageId, parentId: null });
      }}
    >
      <p className="sidebar-label">Pages</p>
      <ul className="tree" role="tree" aria-label="Pages">
        {workspace.tree.map((node) => (
          <TreeRow key={node.id} node={node} depth={0} />
        ))}
      </ul>
      {isDragging && rootDropActive && workspace.hoveredRowId === null ? (
        <div className="root-drop-line" />
      ) : null}
    </div>
  );
}

interface TreeRowProps {
  node: PageTreeNode;
  depth: number;
}

function TreeRow({ node, depth }: TreeRowProps) {
  const workspace = useWorkspace();
  const [dropZone, setDropZone] = useState<DropZone | "invalid" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const expanded = workspace.expandedIds.has(node.id);
  const selected = workspace.activePageId === node.id;
  const hasChildren = node.children.length > 0;
  const draggedPageId = workspace.draggingPageId;

  const captureDraggedId = (event: DragEvent<HTMLDivElement>) => {
    const storedId = event.dataTransfer.getData(pageIdDragType);
    return storedId || draggedPageId || "";
  };

  const effectiveParentFor = (zone: DropZone): string | null =>
    zone === "inside" ? node.id : node.parentId;

  const zoneIsValid = (zone: DropZone): boolean => {
    if (!draggedPageId) {
      return false;
    }
    if (draggedPageId === node.id) {
      return false;
    }
    return !isForbiddenMoveParent(
      workspace.tree ?? [],
      draggedPageId,
      effectiveParentFor(zone),
    );
  };

  const moveTo = (pageId: string, zone: DropZone): MoveRequest => {
    if (zone === "inside") {
      return { pageId, parentId: node.id };
    }
    if (zone === "before") {
      return { pageId, parentId: node.parentId, beforeId: node.id };
    }
    return { pageId, parentId: node.parentId, afterId: node.id };
  };

  return (
    <li role="none">
      {isRenaming ? (
        <RowRenameField
          initialTitle={node.title}
          indent={depth * 16}
          commit={async (title) => {
            const done = await workspace.renamePage(node.id, title);
            if (done) {
              setIsRenaming(false);
            }
          }}
          cancel={() => setIsRenaming(false)}
        />
      ) : (
        <div
          className="tree-row"
          style={{ marginInlineStart: depth * 16 }}
          role="treeitem"
          aria-selected={selected}
          aria-level={depth + 1}
          data-selected={selected}
          data-dragging={draggedPageId === node.id ? "true" : undefined}
          data-drop={dropZone}
          tabIndex={0}
          draggable
          onClick={() => workspace.selectPage(node.id)}
          onDoubleClick={() => setIsRenaming(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              workspace.selectPage(node.id);
            }
          }}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(pageIdDragType, node.id);
            event.dataTransfer.setData("text/plain", node.title);
            workspace.startDrag(node.id);
          }}
          onDragEnd={() => {
            workspace.endDrag();
            setDropZone(null);
          }}
          onDragOver={(event) => {
            if (!draggedPageId) {
              return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            const zone = zoneForPointer(event.currentTarget, event.clientY);
            setDropZone(zoneIsValid(zone) ? zone : "invalid");
            workspace.setHoveredRow(node.id);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) {
              setDropZone(null);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            const pageId = captureDraggedId(event);
            const zone = dropZone;
            setDropZone(null);
            workspace.setHoveredRow(null);
            if (!pageId || zone === null || zone === "invalid") {
              return;
            }
            void workspace.movePage(moveTo(pageId, zone)).then((applied) => {
              if (applied && zone === "inside") {
                workspace.toggleExpanded(node.id);
              }
            });
          }}
        >
          <RowToggle
            hasChildren={hasChildren}
            expanded={expanded}
            onClick={() => workspace.toggleExpanded(node.id)}
          />
          <PageIconNode node={node} />
          <span className="tree-row-title" title={node.title}>
            {node.title}
          </span>
          <span className="tree-row-actions">
            <button
              type="button"
              className="icon-button"
              aria-label={`Add a sub-page to ${node.title}`}
              title="Add a sub-page"
              onClick={(event) => {
                event.stopPropagation();
                void workspace.createPage({ parentId: node.id });
              }}
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Open menu for ${node.title}`}
              title="More options"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              <MoreIcon />
            </button>
          </span>
          {menuOpen ? (
            <RowMenu
              title={node.title}
              onClose={() => setMenuOpen(false)}
              onRename={() => {
                setMenuOpen(false);
                setIsRenaming(true);
              }}
              onDelete={() => {
                setMenuOpen(false);
                void workspace.deletePage(node.id);
              }}
            />
          ) : null}
        </div>
      )}
      {hasChildren && expanded ? (
        <ul className="tree" role="group" aria-label="Sub-pages">
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}


type PageIconProps = { node: PageTreeNode };

function PageIconNode({ node }: PageIconProps) {
  if (node.icon) {
    return (
      <span className="tree-row-icon" aria-hidden>
        {node.icon}
      </span>
    );
  }
  return <FileIcon className="tree-row-icon svg-icon" aria-hidden />;
}

function RowToggle({
  hasChildren,
  expanded,
  onClick,
}: {
  hasChildren: boolean;
  expanded: boolean;
  onClick: () => void;
}) {
  if (!hasChildren) {
    return <span className="tree-row-toggle-spacer" aria-hidden />;
  }
  return (
    <button
      type="button"
      className="icon-button tree-row-toggle"
      aria-label={expanded ? "Collapse" : "Expand"}
      aria-expanded={expanded}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <ChevronRightIcon
        style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 120ms ease" }}
      />
    </button>
  );
}

interface RowRenameFieldProps {
  initialTitle: string;
  indent: number;
  commit: (title: string) => Promise<void> | void;
  cancel: () => void;
}

function RowRenameField({ initialTitle, indent, commit, cancel }: RowRenameFieldProps) {
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    return () => {
      // Ensure a blur fired by unmount does not re-commit.
    };
  }, []);

  return (
    <div className="tree-row" style={{ marginInlineStart: indent }}>
      <input
        ref={inputRef}
        className="tree-row-input"
        type="text"
        value={value}
        maxLength={500}
        aria-label="Page title"
        onChange={(event) => setValue(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            committedRef.current = true;
            void commit(value);
          } else if (event.key === "Escape") {
            event.preventDefault();
            committedRef.current = true;
            cancel();
          }
        }}
        onBlur={() => {
          if (committedRef.current) {
            return;
          }
          if (value.trim() && value !== initialTitle) {
            void commit(value);
          } else {
            cancel();
          }
        }}
      />
    </div>
  );
}

interface RowMenuProps {
  title: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function RowMenu({ title, onClose, onRename, onDelete }: RowMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  return (
    <div ref={menuRef} className="row-menu" role="menu" aria-label={`Options for ${title}`}>
      <button type="button" role="menuitem" className="row-menu-item" onClick={onRename}>
        Rename
      </button>
      <button
        type="button"
        role="menuitem"
        className="row-menu-item"
        onClick={onDelete}
      >
        Move to trash
      </button>
    </div>
  );
}


