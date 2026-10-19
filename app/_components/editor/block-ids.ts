import { Extension } from "@tiptap/core";

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
});
