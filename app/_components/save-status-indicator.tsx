"use client";

import { useSyncExternalStore } from "react";
import { saveStatusStore } from "@/lib/editor-save-status";

/**
 * FR-3.3: a small, quiet indicator near the page title. "Dirty" edits are
 * shown as nothing (calm by design); Saving/Saved/Error states are announced
 * via role="status".
 */
export function SaveStatusIndicator() {
  const snapshot = useSyncExternalStore(
    saveStatusStore.subscribe,
    saveStatusStore.getSnapshot,
  );

  if (snapshot.status === "dirty") {
    // Quiet by design: edits in flight show nothing until a save starts.
    return null;
  }

  if (snapshot.status === "saving") {
    return (
      <span className="save-status" role="status" data-save-status={snapshot.status}>
        Saving…
      </span>
    );
  }

  if (snapshot.status === "error") {
    return (
      <span className="save-status save-status-error" role="status" data-save-status="error">
        Not saved
        <button
          type="button"
          className="save-status-retry"
          onClick={() => saveStatusStore.requestRetry()}
        >
          Retry
        </button>
      </span>
    );
  }

  return (
    <span className="save-status" role="status" data-save-status={snapshot.status}>
      Saved
    </span>
  );
}
