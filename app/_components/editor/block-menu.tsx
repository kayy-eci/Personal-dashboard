"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Node as PmNode } from "@tiptap/pm/model";
import { TextSelection, Transaction } from "@tiptap/pm/state";
import { uuidv7 } from "@/lib/uuid";
import { textColors, turnIntoActions } from "./floating-toolbar";

/** Data the drag-grip click captures for opening the menu. */
export interface BlockMenuState {
  /** Viewport coordinates of the click, for anchoring the menu. */
  x: number;
  y: number;
  node: PmNode;
  from: number;
  to: number;
}

interface TopLevelBlock {
  node: PmNode;
  from: number;
  to: number;
}

/**
 * FR-1.7: find the top-level block the dragged grip belongs to by comparing
 * the grip's vertical center against every top-level block's rendered rows.
 */
export function findTopLevelBlockAtY(
  editor: Editor,
  centerY: number,
): TopLevelBlock | null {
  const view = editor.view;
  let best: TopLevelBlock | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  editor.state.doc.forEach((node, nodeOffset) => {
    // Probe just inside the block so leaf atoms report their row too.
    const probe = nodeOffset + Math.min(1, node.nodeSize - 1);
    const coords = view.coordsAtPos(probe);
    const distance =
      centerY < coords.top
        ? coords.top - centerY
        : Math.max(0, centerY - coords.bottom);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { node, from: nodeOffset, to: nodeOffset + node.nodeSize };
    }
  });
  return best;
}

/**
 * FR-1.1 + FR-1.7: duplicating a block must not reuse the original's stable
 * id; nulling it lets the repository assign a fresh UUIDv7 on the next save.
 */
function duplicateBlock(editor: Editor, block: TopLevelBlock): void {
  const { node, to } = block;
  // FR-1.1: the copy gets its own UUIDv7 immediately, in the renderer, so the
  // renderer's document is already consistent on the next save (no id churn).
  const copy = node.type.create({ ...node.attrs, id: uuidv7() }, node.content);
  const tr: Transaction = editor.state.tr;
  tr.insert(to, copy);
  tr.setSelection(TextSelection.near(tr.doc.resolve(to)));
  tr.scrollIntoView();
  editor.view.dispatch(tr);
  editor.view.focus();
}

function deleteBlock(editor: Editor, block: TopLevelBlock): void {
  const tr: Transaction = editor.state.tr;
  tr.delete(block.from, block.to);
  if (tr.doc.childCount === 0) {
    // Never leave an empty document behind; give the cursor a paragraph.
    const paragraphType = editor.state.doc.type.contentMatch.defaultType;
    if (paragraphType) {
      tr.insert(1, paragraphType.create());
    }
  }
  const cursorAt = Math.min(block.from, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(cursorAt)));
  tr.scrollIntoView();
  editor.view.dispatch(tr);
  editor.view.focus();
}

type MenuPanel = "main" | "turn-into" | "color";

/**
 * FR-1.7: the drag-handle click menu — duplicate, turn into, color and
 * delete for the top-level block under the grip. Rendered once per editor
 * and opened from `doc-editor` when the grip is clicked.
 */
export function BlockMenu({
  editor,
  menu,
  onClose,
}: {
  editor: Editor;
  menu: BlockMenuState;
  onClose: () => void;
}) {
  const [panel, setPanel] = useState<MenuPanel>("main");

  // Escape closes the menu; the block range cannot drift while open because
  // the overlay keeps the document out of reach.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const colorBlock = (value: string | undefined) => () => {
    if (!menu.node.inlineContent) {
      return;
    }
    const range = {
      from: menu.from + 1,
      // The last position inside the block, covering every inline node.
      to: Math.max(menu.from + 1, menu.to - 1),
    };
    if (value === undefined) {
      editor.chain().setTextSelection(range).focus().unsetColor().run();
    } else {
      editor.chain().setTextSelection(range).focus().setColor(value).run();
    }
    onClose();
  };

  const duplicate = () => {
    onClose();
    duplicateBlock(editor, menu);
  };

  const remove = () => {
    onClose();
    deleteBlock(editor, menu);
  };

  const turnInto = (run: (editor: Editor) => void) => () => {
    run(editor);
    onClose();
  };

  // Keep the menu on screen even when the grip sits close to an edge.
  const left = Math.max(8, Math.min(menu.x, window.innerWidth - 248));
  const top = Math.max(8, Math.min(menu.y, window.innerHeight - 320));

  return (
    <>
      {/* Click-away layer; the menu itself stops propagation below. */}
      <div className="block-menu-overlay" onMouseDown={onClose} aria-hidden />
      <div
        className="block-menu"
        role="menu"
        aria-label="Block actions"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ left, top }}
      >
        {panel === "main" ? (
          <>
            <button
              type="button"
              role="menuitem"
              className="block-menu-item"
              onClick={duplicate}
            >
              Duplicate
            </button>
            <button
              type="button"
              role="menuitem"
              className="block-menu-item"
              onClick={() => setPanel("turn-into")}
            >
              Turn into <span aria-hidden className="block-menu-arrow">▸</span>
            </button>
            {menu.node.inlineContent ? (
              <button
                type="button"
                role="menuitem"
                className="block-menu-item"
                onClick={() => setPanel("color")}
              >
                Color <span aria-hidden className="block-menu-arrow">▸</span>
              </button>
            ) : null}
            <span className="block-menu-sep" aria-hidden />
            <button
              type="button"
              role="menuitem"
              className="block-menu-item block-menu-danger"
              onClick={remove}
            >
              Delete
            </button>
          </>
        ) : null}

        {panel === "turn-into" ? (
          <>
            <button
              type="button"
              role="menuitem"
              className="block-menu-item block-menu-back"
              onClick={() => setPanel("main")}
            >
              <span aria-hidden className="block-menu-arrow">◂</span> Back
            </button>
            {turnIntoActions.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                className="block-menu-item"
                onClick={turnInto(action.run)}
              >
                {action.label}
              </button>
            ))}
          </>
        ) : null}

        {panel === "color" ? (
          <>
            <button
              type="button"
              role="menuitem"
              className="block-menu-item block-menu-back"
              onClick={() => setPanel("main")}
            >
              <span aria-hidden className="block-menu-arrow">◂</span> Back
            </button>
            {textColors.map((entry) => (
              <button
                key={entry.label}
                type="button"
                role="menuitem"
                className="block-menu-item"
                onClick={colorBlock(entry.value)}
              >
                <span
                  className="toolbar-palette-swatch"
                  style={{ background: entry.value ?? "var(--color-bg)" }}
                />
                {entry.label}
              </button>
            ))}
          </>
        ) : null}
      </div>
    </>
  );
}

export default BlockMenu;
