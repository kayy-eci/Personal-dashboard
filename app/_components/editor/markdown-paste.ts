import { Extension } from "@tiptap/core";
import { Fragment, Node as PmNode, Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { markdownToContent } from "@/lib/markdown-paste";

/**
 * FR-1.9: markdown plain-text paste becomes blocks. Rich HTML still wins (the
 * handler declines whenever an HTML flavour is present, so ProseMirror's
 * default HTML parsing applies); Ctrl/Cmd+Shift+V stays plain text because the
 * Edit menu's pasteAndMatchStyle role does not route through handlePaste.
 */
export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view: EditorView, event: ClipboardEvent) => {
            const clipboard = event.clipboardData;
            if (!clipboard || clipboard.getData("text/html")) {
              return false;
            }
            const text = clipboard.getData("text/plain");
            if (!text) {
              return false;
            }
            const content = markdownToContent(text);
            if (!content) {
              return false;
            }
            const nodes = content.map((node) =>
              // The parser emits schema-shaped Tiptap JSON by construction.
              PmNode.fromJSON(
                view.state.schema,
                node as unknown as Parameters<typeof PmNode.fromJSON>[1],
              ),
            );
            event.preventDefault();
            const slice = Slice.maxOpen(Fragment.fromArray(nodes));
            view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});
