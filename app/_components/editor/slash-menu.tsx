"use client";

import type { Editor, Range } from "@tiptap/core";
import {
  Extension,
} from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { SlashMenuPopup, type SlashMenuRef } from "./slash-popup";

export interface SlashItem {
  id: string;
  label: string;
  description: string;
  keywords?: string[];
  run: (editor: Editor, range: Range) => void;
}

function heading(level: 1 | 2 | 3): (editor: Editor, range: Range) => void {
  return (editor, range) => {
    editor.chain().focus().deleteRange(range).toggleHeading({ level }).run();
  };
}

function toggleList(
  type: "bulletList" | "orderedList" | "taskList",
): (editor: Editor, range: Range) => void {
  return (editor, range) => {
    const chain = editor.chain().focus().deleteRange(range);
    if (type === "bulletList") {
      chain.toggleBulletList().run();
    } else if (type === "orderedList") {
      chain.toggleOrderedList().run();
    } else {
      chain.toggleTaskList().run();
    }
  };
}

function pickImageFile(editor: Editor, range: Range): void {
  editor.chain().focus().deleteRange(range).run();
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/gif,image/webp,image/avif";
  input.onchange = async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) {
      return;
    }
    const bytes = await file.arrayBuffer();
    const api = window.lifeos;
    if (!api) {
      return;
    }
    try {
      const stored = await api.saveAttachment({ mime: file.type, bytes });
      editor.chain().focus().setImage({ src: stored.urlPath, alt: file.name }).run();
    } catch {
      console.error("LifeOS could not save the attached image");
    }
  };
  input.click();
}

/** Slash menu items; labels and descriptions in sentence case. */
function createSlashItems(onCreateSubPage?: (() => void) | null): SlashItem[] {
  return [
    // FR-2.3: creating a sub-page from the slash menu.
    ...(onCreateSubPage
      ? [
          {
            id: "sub-page",
            label: "Page",
            description: "Create a sub-page under this page",
            keywords: ["child", "sub", "notes"],
            run: (editor: Editor, range: Range) => {
              editor.chain().focus().deleteRange(range).run();
              onCreateSubPage();
            },
          },
        ]
      : []),
    {
      id: "heading-1",
      label: "Heading 1",
      description: "Section heading (large)",
      keywords: ["h1", "title"],
      run: heading(1),
    },
    {
      id: "heading-2",
      label: "Heading 2",
      description: "Subsection heading (medium)",
      keywords: ["h2"],
      run: heading(2),
    },
    {
      id: "heading-3",
      label: "Heading 3",
      description: "Minor grouping (small)",
      keywords: ["h3"],
      run: heading(3),
    },
    {
      id: "bullet-list",
      label: "Bulleted list",
      description: "Simple list items",
      keywords: ["unordered"],
      run: toggleList("bulletList"),
    },
    {
      id: "numbered-list",
      label: "Numbered list",
      description: "List with numbering",
      keywords: ["ordered"],
      run: toggleList("orderedList"),
    },
    {
      id: "to-do-list",
      label: "To-do list",
      description: "Track tasks with checkboxes",
      keywords: ["task", "checklist"],
      run: toggleList("taskList"),
    },
    {
      id: "quote",
      label: "Quote",
      description: "Capture a quotation",
      run: (editor, range) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      id: "callout",
      label: "Callout",
      description: "Highlighted note with an icon",
      keywords: ["info"],
      run: (editor, range) => {
        editor.chain().focus().deleteRange(range).setCallout().run();
      },
    },
    {
      id: "code-block",
      label: "Code block",
      description: "Code with syntax highlighting",
      run: (editor, range) => {
        editor.chain().focus().deleteRange(range).setCodeBlock().run();
      },
    },
    {
      id: "divider",
      label: "Divider",
      description: "Visually separate sections",
      keywords: ["hr", "line", "rule"],
      run: (editor, range) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      id: "image",
      label: "Image",
      description: "Insert an image file",
      keywords: ["picture", "photo"],
      run: pickImageFile,
    },
    {
      id: "table",
      label: "Table",
      description: "Insert a simple table",
      run: (editor, range) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 2, cols: 3, withHeaderRow: true })
          .run();
      },
    },
    {
      id: "toggle",
      label: "Toggle",
      description: "Collapsible section",
      keywords: ["details", "summary"],
      run: (editor, range) => {
        editor.chain().focus().deleteRange(range).setDetails().run();
      },
    },
  ];
}

function filterItems(items: readonly SlashItem[], query: string): SlashItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...items];
  }
  const tokens = normalizedQuery.split(/\s+/);
  return items.filter((item) => {
    const haystack = [
      item.label,
      item.description,
      ...(item.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

interface SlashMenuPopupProps {
  items: SlashItem[];
  query: string;
  command: (item: SlashItem) => void;
}

/**
 * The "/" menu (FR-1.4) driven by @tiptap/suggestion. The popup itself is
 * rendered through ReactRenderer and positioned by the plugin.
 */
export const SlashMenu = Extension.create({
  name: "slashMenu",

  addOptions() {
    return {
      // Provided by the page editor; without it the Page item is hidden.
      onCreateSubPage: null as (() => void) | null,
    };
  },

  addProseMirrorPlugins() {
    const extensionEditor = this.editor;
    const slashItems = createSlashItems(this.options.onCreateSubPage);

    return [
      Suggestion<SlashItem, SlashItem>({
        editor: extensionEditor,
        char: "/",
        startOfLine: false,
        placement: "bottom-start",
        items: ({ query }) => filterItems(slashItems, query),
        command: ({ editor, range, props: item }) => {
          item.run(editor, range);
        },
        render() {
          let renderer: ReactRenderer<SlashMenuRef, SlashMenuPopupProps> | null =
            null;
          let unmount: (() => void) | null = null;

          return {
            onStart(props: SuggestionProps<SlashItem, SlashItem>) {
              renderer = new ReactRenderer(SlashMenuPopup, {
                editor: props.editor,
                props: {
                  items: props.items,
                  query: props.query,
                  command: props.command,
                },
              });
              unmount = props.mount(renderer.element as HTMLElement);
            },
            onUpdate(props: SuggestionProps<SlashItem, SlashItem>) {
              renderer?.updateProps({
                items: props.items,
                query: props.query,
                command: props.command,
              });
            },
            onExit() {
              unmount?.();
              unmount = null;
              renderer?.destroy();
              renderer = null;
            },
            onKeyDown({ event }: SuggestionKeyDownProps) {
              const ref = renderer?.ref as SlashMenuRef | null | undefined;
              if (!ref) {
                return false;
              }
              return ref.onKeyDown(event);
            },
          };
        },
      }),
    ];
  },
});
