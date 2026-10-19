import { Extension } from "@tiptap/core";
import { Node as PmNode } from "@tiptap/pm/model";
import { TextSelection, Transaction } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";

interface TopLevelBlock {
  node: PmNode;
  index: number;
  from: number;
  to: number;
}

function findTopLevelBlock(editor: Editor): TopLevelBlock | null {
  const { state } = editor;
  const { selection } = state;
  const $from = selection.$from;
  if (state.doc.childCount === 0) {
    return null;
  }
  // The index of the innermost top-level block that contains the selection.
  const index = $from.index(0);
  const node = state.doc.child(index);
  if (!node) {
    return null;
  }
  const from = $from.before(1);
  return { node, index, from, to: from + node.nodeSize };
}

function moveBlock(editor: Editor, direction: -1 | 1): boolean {
  const block = findTopLevelBlock(editor);
  if (!block) {
    return false;
  }
  const { doc } = editor.state;
  if (
    (direction === -1 && block.index <= 0) ||
    (direction === 1 && block.index >= doc.childCount - 1)
  ) {
    return false;
  }

  const { from, to, node, index } = block;
  const targetStart =
    direction === -1
      ? from - doc.child(index - 1).nodeSize
      : // After the delete, the next sibling starts at `from`; the moved block
        // goes directly after it.
        from + doc.child(index + 1).nodeSize;

  editor.view.dispatch(
    (() => {
      const tr: Transaction = editor.state.tr;
      tr.delete(from, to);
      tr.insert(targetStart, node);
      const cursorAt = TextSelection.create(tr.doc, targetStart + 1);
      tr.setSelection(cursorAt);
      return tr;
    })(),
  );
  return true;
}

function indentListItem(editor: Editor, sink: boolean): boolean {
  if (editor.isActive("taskItem")) {
    return sink
      ? editor.chain().focus().sinkListItem("taskItem").run()
      : editor.chain().focus().liftListItem("taskItem").run();
  }
  if (editor.isActive("listItem")) {
    return sink
      ? editor.chain().focus().sinkListItem("listItem").run()
      : editor.chain().focus().liftListItem("listItem").run();
  }
  return false;
}

/**
 * FR-1.7 keyboard block moves and FR-1.8 Tab/Shift+Tab list nesting.
 * (Block drag comes from the DragHandle extension.)
 */
export const BlockEditing = Extension.create({
  name: "blockEditing",

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-ArrowUp": () => moveBlock(this.editor, -1),
      "Mod-Shift-ArrowDown": () => moveBlock(this.editor, 1),
      Tab: ({ editor }) => indentListItem(editor, true),
      "Shift-Tab": ({ editor }) => indentListItem(editor, false),
    };
  },
});
