"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "./workspace-provider";
import { CloseIcon } from "./icons";

const generalShortcuts: readonly ShortcutRow[] = [
  { keys: "Ctrl/Cmd + N", action: "New page" },
  { keys: "Ctrl/Cmd + Shift + B", action: "Toggle sidebar" },
  { keys: "Ctrl/Cmd + Shift + L", action: "Change theme" },
  { keys: "Ctrl/Cmd + Z", action: "Undo" },
  { keys: "Ctrl/Cmd + Shift + Z", action: "Redo" },
  { keys: "Ctrl/Cmd + Shift + V", action: "Paste without format" },
];

const editorShortcuts: readonly ShortcutRow[] = [
  { keys: "/", action: "Open the slash menu" },
  { keys: "Ctrl/Cmd + B", action: "Bold" },
  { keys: "Ctrl/Cmd + I", action: "Italic" },
  { keys: "Ctrl/Cmd + U", action: "Underline" },
  { keys: "Ctrl/Cmd + E", action: "Inline code" },
  { keys: "Ctrl/Cmd + K", action: "Edit link on selection" },
  { keys: "Ctrl/Cmd + Shift + S", action: "Strikethrough" },
  { keys: "Ctrl/Cmd + Shift + ↑ / ↓", action: "Move block up / down" },
  { keys: "Tab / Shift + Tab", action: "Indent / outdent list item" },
];

interface ShortcutRow {
  keys: string;
  action: string;
}

export function ShortcutsDialog() {
  const { shortcutsOpen, closeShortcuts } = useWorkspace();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!shortcutsOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeShortcuts();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcutsOpen, closeShortcuts]);

  if (!shortcutsOpen) {
    return null;
  }

  return (
    <div className="dialog-overlay" onPointerDown={() => closeShortcuts()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="dialog"
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h2 className="dialog-title">Keyboard shortcuts</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close keyboard shortcuts"
            onClick={closeShortcuts}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="shortcut-list">
          <ShortcutSection heading="App" rows={generalShortcuts} />
          <ShortcutSection heading="Editor" rows={editorShortcuts} />
        </div>
      </div>
    </div>
  );
}

function ShortcutSection({
  heading,
  rows,
}: {
  heading: string;
  rows: readonly ShortcutRow[];
}) {
  return (
    <section className="shortcut-section">
      <h3 className="shortcut-heading">{heading}</h3>
      <ul className="shortcut-rows">
        {rows.map((row) => (
          <li key={row.keys} className="shortcut-row">
            <kbd className="shortcut-keys">{row.keys}</kbd>
            <span className="shortcut-action">{row.action}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
