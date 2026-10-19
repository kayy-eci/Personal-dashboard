/**
 * The autosave engine of one page editor (FR-3.2/FR-3.3). Pure closures with
 * a serialized save queue so overlapping schedules cannot race. The renderer
 * wires `snapshot` (the live editor JSON) and `savePage` (typed IPC) and maps
 * state changes onto the save status store.
 */

export type SaveState = "saving" | "saved" | "error" | "dirty";

export interface PageSaverOptions {
  pageId: string;
  /** Returns the latest document JSON, or null when nothing is mounted. */
  snapshot: () => string | null;
  savePage: (pageId: string, contentJson: string) => Promise<void>;
  onStateChange: (state: SaveState) => void;
  debounceMs?: number;
  hardFlushMs?: number;
}

export interface PageSaver {
  /** Marks the given document JSON as already persisted. */
  setPersisted: (contentJson: string) => void;
  /** Called after every edit: debounces, or forces a save during long typing. */
  schedule: () => void;
  /** Cancels the debounce and saves immediately; resolves when settled. */
  flush: () => Promise<void>;
}

let activeSaver: PageSaver | null = null;

/** The active editor registers its saver for app-close flushing (FR-3.2). */
export function setActiveSaver(saver: PageSaver | null): void {
  activeSaver = saver;
}

export function flushActiveSaver(): Promise<void> {
  return activeSaver ? activeSaver.flush() : Promise.resolve();
}

const saveLoopGuardRuns = 64;

export function createPageSaver(options: PageSaverOptions): PageSaver {
  const {
    pageId,
    snapshot,
    savePage,
    onStateChange,
    debounceMs = 500,
    hardFlushMs = 5000,
  } = options;

  let lastSavedJson = "";
  let lastSaveTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();

  function publish(next: SaveState): void {
    onStateChange(next);
  }

  async function runSaveFlow(): Promise<void> {
    let failed = false;
    for (let guard = 0; guard < saveLoopGuardRuns; guard += 1) {
      const contentJson = snapshot();
      if (!contentJson || contentJson === lastSavedJson) {
        break;
      }
      publish("saving");
      try {
        await savePage(pageId, contentJson);
        lastSavedJson = contentJson;
        lastSaveTime = Date.now();
      } catch {
        // The dirty content stays in memory in the editor; the next edit, blur
        // or page switch retries (FR-3.3: never pass silently).
        failed = true;
        break;
      }
    }
    publish(failed ? "error" : "saved");
  }

  function enqueue(): Promise<void> {
    const next = chain.then(runSaveFlow);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  function queue(ms: number): void {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      void enqueue();
    }, ms);
  }

  return {
    setPersisted(contentJson) {
      lastSavedJson = contentJson;
      lastSaveTime = Date.now();
      publish("saved");
    },
    schedule() {
      publish("dirty");
      const now = Date.now();
      // Continuous typing never starves persistence: force a save at most
      // this often while the user types.
      if (now - lastSaveTime >= hardFlushMs) {
        lastSaveTime = now;
        void enqueue();
        return;
      }
      queue(debounceMs);
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      return enqueue();
    },
  };
}
