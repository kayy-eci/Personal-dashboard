"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./workspace-provider";
import { CloseIcon, FileIcon, RestoreIcon } from "./icons";

export function TrashDialog() {
  const workspace = useWorkspace();
  const {
    trashOpen,
    closeTrash,
    isTrashLoading,
    trashEntries,
    restorePage,
  } = workspace;
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!trashOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTrash();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [trashOpen, closeTrash]);

  if (!trashOpen) {
    return null;
  }

  return (
    <div className="dialog-overlay" onPointerDown={() => closeTrash()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Trash"
        className="dialog"
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h2 className="dialog-title">Trash</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close trash"
            onClick={closeTrash}
          >
            <CloseIcon />
          </button>
        </div>
        {isTrashLoading ? (
          <p className="dialog-note">Loading…</p>
        ) : trashEntries.length === 0 ? (
          <p className="dialog-note">Nothing in the trash.</p>
        ) : (
          <ul className="trash-list">
            {trashEntries.map((entry) => (
              <TrashRow
                key={entry.id}
                entry={entry}
                onRestore={() => void restorePage(entry.id)}
                onPurge={() => void workspace.purgePage(entry.id)}
              />
            ))}
          </ul>
        )}
        <p className="dialog-note">
          Pages in the trash are removed automatically after 30 days.
        </p>
      </div>
    </div>
  );
}

interface TrashRowProps {
  entry: {
    id: string;
    title: string;
    icon: string | null;
    deletedAt: string | null;
  };
  onRestore: () => void;
  onPurge: () => void;
}

function TrashRow({ entry, onRestore, onPurge }: TrashRowProps) {
  // FR-2.6: permanent deletion needs an explicit confirmation step. Per-row
  // local state means closing the dialog or a reload clears it.
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="trash-item">
      {entry.icon ? (
        <span className="trash-item-icon" aria-hidden>
          {entry.icon}
        </span>
      ) : (
        <FileIcon className="trash-item-icon svg-icon" aria-hidden />
      )}
      <div className="trash-item-text">
        <span className="trash-item-title" title={entry.title}>
          {entry.title}
        </span>
        <span className="trash-item-date">{formatDeletedDate(entry.deletedAt)}</span>
      </div>
      <button type="button" className="secondary-button" onClick={onRestore}>
        <RestoreIcon className="svg-icon" aria-hidden />
        Restore
      </button>
      {confirming ? (
        <button
          type="button"
          className="secondary-button delete-permanently-confirm"
          onClick={() => {
            setConfirming(false);
            onPurge();
          }}
        >
          Really delete?
        </button>
      ) : (
        <button
          type="button"
          className="secondary-button delete-permanently"
          aria-label={`Delete ${entry.title} permanently`}
          onClick={() => setConfirming(true)}
        >
          Delete
        </button>
      )}
    </li>
  );
}

function formatDeletedDate(deletedAt: string | null): string {
  if (!deletedAt) {
    return "Deleted recently";
  }
  const date = new Date(deletedAt);
  if (Number.isNaN(date.getTime())) {
    return "Deleted recently";
  }
  return `Deleted ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}
