import { Node, mergeAttributes } from "@tiptap/core";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { icon?: string | null }) => ReturnType;
      unsetCallout: () => ReturnType;
      toggleCallout: (attributes?: { icon?: string | null }) => ReturnType;
    };
  }
}

/**
 * A Notion-style callout block: one or more blocks in a tinted container with
 * a configurable emoji icon.
 */
export const Callout = Node.create<CalloutOptions>({
  name: "callout",
  content: "block+",
  group: "block",
  defining: true,

  addOptions(): CalloutOptions {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      icon: {
        default: "ℹ️",
        parseHTML: (element) => element.getAttribute("data-icon"),
        renderHTML: (attributes) =>
          attributes.icon ? { "data-icon": String(attributes.icon) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-callout": "", class: "callout" }, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout: (attributes) => ({ commands }) =>
        commands.wrapIn(this.type, attributes),
      unsetCallout: () => ({ commands }) => commands.lift(this.type),
      toggleCallout: (attributes) => ({ editor, commands }) =>
        editor.isActive(this.name)
          ? commands.lift(this.type)
          : commands.wrapIn(this.type, attributes),
    };
  },
});
