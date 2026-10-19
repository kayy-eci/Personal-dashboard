import { Extension } from "@tiptap/core";
import { Node as PmNode } from "@tiptap/pm/model";
import { type EditorState, Plugin, type Transaction } from "@tiptap/pm/state";
import { uuidv7 } from "@/lib/uuid";

/**
 * FR-1.1: every top-level document block carries a stable unique `id`.
 * The repository assigns ids to stored documents missing them and bumps the
 * document schema_version; this extension keeps the attribute in the editor
 * schema so ids survive the editor JSON round-trip instead of being dropped.
 */
const blockIdAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute("data-block-id"),
  renderHTML: (attributes: { id?: string | null }) =>
    attributes.id ? { "data-block-id": attributes.id as string } : {},
};

/** Node types that can appear directly under the document. */
const topLevelTypes = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "callout",
  "codeBlock",
  "table",
  "details",
  "image",
  "horizontalRule",
];

/**
 * Invariant guard for uniqueness. ProseMirror copies block attributes when
 * they are naturally cloned: splitting a paragraph (Enter), turning a block
 * into another type, and pasting copies all re-create nodes with the source
 * block's `id`. This keeps only the first occurrence of each id and hands
 * every later duplicate a fresh UUIDv7, so block movement stays stable and
 * duplication is automatic.
 */
function dedupeTopLevelBlockIds(state: EditorState): Transaction | null {
  const seen = new Set<string>();
  const duplicates: Array<{ from: number; node: PmNode }> = [];
  state.doc.forEach((node, offset) => {
    const id = node.attrs.id;
    const explicit = typeof id === "string" && id !== "" ? id : "";
    if (explicit !== "") {
      if (seen.has(explicit)) {
        duplicates.push({ from: offset, node });
      } else {
        seen.add(explicit);
      }
    }
  });
  if (duplicates.length === 0) {
    return null;
  }
  const tr = state.tr;
  for (const { from, node } of duplicates) {
    tr.setNodeMarkup(from, undefined, { ...node.attrs, id: uuidv7() });
  }
  return tr;
}

export const BlockIds = Extension.create({
  name: "blockIds",

  addGlobalAttributes() {
    return [
      {
        types: topLevelTypes,
        attributes: {
          id: blockIdAttribute,
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          // Selection-only updates cannot introduce duplicates.
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }
          return dedupeTopLevelBlockIds(newState);
        },
      }),
    ];
  },
});

export default BlockIds;
