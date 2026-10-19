"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import { useWorkspace } from "../workspace-provider";

const textColors: Array<{ label: string; value: string | undefined }> = [
  { label: "Default", value: undefined },
  { label: "Gray", value: "#6b6b6b" },
  { label: "Green", value: "#647c64" },
  { label: "Brown", value: "#9f6b53" },
  { label: "Blue", value: "#4a7d97" },
  { label: "Red", value: "#a85556" },
];

const highlightColors: Array<{ label: string; value: string | undefined }> = [
  { label: "None", value: undefined },
  { label: "Gray", value: "#f1f1ef" },
  { label: "Green", value: "#e2efe2" },
  { label: "Blue", value: "#ddebf1" },
  { label: "Yellow", value: "#fdecc8" },
  { label: "Red", value: "#f4dddd" },
];

interface TurnIntoAction {
  label: string;
  run: (editor: Editor) => void;
}

const turnIntoActions: TurnIntoAction[] = [
  { label: "Text", run: (editor) => editor.chain().focus().setParagraph().run() },
  { label: "Heading 1", run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Bulleted list", run: (editor) => editor.chain().focus().toggleBulletList().run() },
  { label: "Numbered list", run: (editor) => editor.chain().focus().toggleOrderedList().run() },
  { label: "To-do list", run: (editor) => editor.chain().focus().toggleTaskList().run() },
  { label: "Quote", run: (editor) => editor.chain().focus().toggleBlockquote().run() },
  { label: "Callout", run: (editor) => editor.chain().focus().toggleCallout().run() },
  { label: "Code block", run: (editor) => editor.chain().focus().setCodeBlock().run() },
];

function currentBlockLabel(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "Heading 1";
  if (editor.isActive("heading", { level: 2 })) return "Heading 2";
  if (editor.isActive("heading", { level: 3 })) return "Heading 3";
  if (editor.isActive("bulletList")) return "Bulleted list";
  if (editor.isActive("orderedList")) return "Numbered list";
  if (editor.isActive("taskList")) return "To-do list";
  if (editor.isActive("blockquote")) return "Quote";
  if (editor.isActive("callout")) return "Callout";
  if (editor.isActive("codeBlock")) return "Code block";
  return "Text";
}

const codeLanguages = [
  "",
  "typescript",
  "javascript",
  "json",
  "python",
  "bash",
  "sql",
  "java",
  "html",
  "css",
  "markdown",
];

export function FloatingToolbar({ editor }: { editor: Editor }) {
  const { pushError } = useWorkspace();
  const [editingLink, setEditingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [palette, setPalette] = useState<"color" | "highlight" | null>(null);
  const [turnIntoOpen, setTurnIntoOpen] = useState(false);

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    }
    setEditingLink(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: activeEditor, view, from, to }) =>
        view.hasFocus() && from !== to && activeEditor.isEditable
      }
    >
      <div className="floating-toolbar">
        {editingLink ? (
          <form
            className="toolbar-link-form"
            onSubmit={(event) => {
              event.preventDefault();
              applyLink();
            }}
          >
            <input
              className="toolbar-link-input"
              type="text"
              autoFocus
              placeholder="Paste a link, press Enter…"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setEditingLink(false);
                }
              }}
              onBlur={() => setEditingLink(false)}
            />
          </form>
        ) : (
          <>
            <button
              type="button"
              className={toolbarButtonClass(editor.isActive("bold"))}
              aria-label="Bold"
              title="Bold"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              B
            </button>
            <button
              type="button"
              className={`toolbar-button ${editor.isActive("italic") ? "is-active" : ""}`}
              aria-label="Italic"
              title="Italic"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <em>I</em>
            </button>
            <button
              type="button"
              className={toolbarButtonClass(editor.isActive("underline"))}
              aria-label="Underline"
              title="Underline"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <u>U</u>
            </button>
            <button
              type="button"
              className={toolbarButtonClass(editor.isActive("strike"))}
              aria-label="Strikethrough"
              title="Strikethrough"
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <s>S</s>
            </button>
            <button
              type="button"
              className={toolbarButtonClass(editor.isActive("code"))}
              aria-label="Inline code"
              title="Inline code"
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <code>{"{}"}</code>
            </button>

            <span className="toolbar-sep" aria-hidden />

            <button
              type="button"
              className={`${toolbarButtonClass(editor.isActive("highlight"))} toolbar-popover-trigger`}
              aria-label="Highlight"
              title="Highlight"
              onClick={() =>
                setPalette((current) => (current === "highlight" ? null : "highlight"))
              }
            >
              🖍️
            </button>
            <button
              type="button"
              className="toolbar-button toolbar-popover-trigger"
              aria-label="Text color"
              title="Text color"
              onClick={() =>
                setPalette((current) => (current === "color" ? null : "color"))
              }
            >
              A
            </button>

            <span className="toolbar-sep" aria-hidden />

            <button
              type="button"
              className={toolbarButtonClass(editor.isActive("link"))}
              aria-label="Link"
              title="Link"
              onClick={() => {
                const existing =
                  editor.getAttributes("link").href?.toString() ?? "";
                setLinkUrl(existing);
                setEditingLink(true);
              }}
            >
              🔗
            </button>

            <div className="toolbar-turn-into">
              <button
                type="button"
                className="toolbar-button"
                aria-haspopup="listbox"
                aria-expanded={turnIntoOpen}
                onClick={() => setTurnIntoOpen((open) => !open)}
              >
                {currentBlockLabel(editor)}
                <span aria-hidden>▾</span>
              </button>
              {turnIntoOpen ? (
                <ul className="turn-into-menu" role="listbox">
                  {turnIntoActions.map((action) => (
                    <li key={action.label}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={currentBlockLabel(editor) === action.label}
                        onClick={() => {
                          setTurnIntoOpen(false);
                          action.run(editor);
                        }}
                      >
                        {action.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </>
        )}

        {editor.isActive("codeBlock") ? (
          <select
            className="toolbar-select"
            aria-label="Code language"
            value={(editor.getAttributes("codeBlock").language as string) ?? ""}
            onChange={(event) =>
              editor
                .chain()
                .focus()
                .updateAttributes("codeBlock", {
                  language: event.target.value || null,
                })
                .run()
            }
          >
            {codeLanguages.map((language) => (
              <option key={language} value={language}>
                {language || "Plain text"}
              </option>
            ))}
          </select>
        ) : null}

        {editor.isActive("table") ? (
          <div className="toolbar-table-actions">
            <button
              type="button"
              className="toolbar-button"
              title="Add row"
              aria-label="Add row"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              + Row
            </button>
            <button
              type="button"
              className="toolbar-button"
              title="Add column"
              aria-label="Add column"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              + Column
            </button>
            <button
              type="button"
              className="toolbar-button"
              title="Delete row"
              aria-label="Delete row"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              − Row
            </button>
            <button
              type="button"
              className="toolbar-button"
              title="Delete column"
              aria-label="Delete column"
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              − Column
            </button>
            <button
              type="button"
              className="toolbar-button"
              title="Delete table"
              aria-label="Delete table"
              onClick={() => { editor.chain().focus().deleteTable().run(); }}
            >
              Delete table
            </button>
          </div>
        ) : null}

        {palette ? (
          <div className="toolbar-popover" role="menu">
            {(palette === "color" ? textColors : highlightColors).map((entry) => (
              <button
                key={entry.label}
                type="button"
                role="menuitem"
                className="toolbar-palette-item"
                onClick={() => {
                  try {
                    if (palette === "color") {
                      if (entry.value === undefined) {
                        editor.chain().focus().unsetColor().run();
                      } else {
                        editor.chain().focus().setColor(entry.value).run();
                      }
                    } else if (entry.value === undefined) {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().setHighlight({ color: entry.value }).run();
                    }
                  } catch {
                    pushError("The format could not be applied.");
                  }
                  setPalette(null);
                }}
              >
                <span
                  className="toolbar-palette-swatch"
                  style={{ background: entry.value ?? "var(--color-bg)" }}
                />
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </BubbleMenu>
  );
}

function toolbarButtonClass(active: boolean): string {
  return active ? "toolbar-button is-active" : "toolbar-button";
}
