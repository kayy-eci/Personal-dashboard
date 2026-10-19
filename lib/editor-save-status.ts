"use client";

/**
 * Global save status store (FR-3.3). The active editor publishes state changes
 * here; the quiet indicator near the page title subscribes with
 * useSyncExternalStore. The token also powers the Retry button: the indicator
 * bumps it, the editor reacts by flushing.
 */

export type SaveStatus = "saving" | "saved" | "error" | "dirty";

export interface SaveStatusSnapshot {
  status: SaveStatus;
  retryToken: number;
}

let snapshot: SaveStatusSnapshot = { status: "saved", retryToken: 0 };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function replace(next: SaveStatusSnapshot): void {
  if (next.status === snapshot.status && next.retryToken === snapshot.retryToken) {
    return;
  }
  snapshot = next;
  emit();
}

export const saveStatusStore = {
  getSnapshot: (): SaveStatusSnapshot => snapshot,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Transitions are deduplicated; repeated keystrokes cause no re-render. */
  set(status: SaveStatus): void {
    replace({ ...snapshot, status });
  },
  requestRetry(): void {
    replace({ ...snapshot, retryToken: snapshot.retryToken + 1 });
  },
};
