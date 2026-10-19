import test from "node:test";
import assert from "node:assert/strict";
import { createPageSaver } from "../dist-electron/lib/page-saver.js";

function delay(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function makeSaver(overrides = {}) {
  const events = { saves: [], states: [] };
  let snapshotJson = null;
  const saver = createPageSaver({
    pageId: "page-1",
    snapshot: () => snapshotJson,
    savePage: async (pageId, contentJson) => {
      assert.equal(pageId, "page-1");
      events.saves.push(contentJson);
    },
    onStateChange: (state) => {
      events.states.push(state);
    },
    debounceMs: 20,
    hardFlushMs: 5000,
    ...overrides,
  });
  return { saver, events, setSnapshot: (json) => { snapshotJson = json; } };
}

test("flush persists only the latest snapshot after rapid edits", async () => {
  const { saver, events, setSnapshot } = makeSaver();

  setSnapshot('{"v":0}');
  saver.setPersisted('{"v":0}');
  assert.deepEqual(events.saves, []);

  setSnapshot('{"v":1}');
  saver.schedule();
  setSnapshot('{"v":2}');
  saver.schedule();

  await saver.flush();

  assert.deepEqual(events.saves, ['{"v":2}']);
  assert.equal(events.states.at(-1), "saved");
});

test("continuous typing triggers a hard flush before the debounce elapses", async () => {
  let version = 0;
  const { saver, events, setSnapshot } = makeSaver({
    debounceMs: 300,
    hardFlushMs: 50,
  });

  version += 1;
  setSnapshot(`{"v":${version}}`);
  saver.setPersisted(`{"v":${version}}`);

  for (let tick = 0; tick < 10; tick += 1) {
    version += 1;
    setSnapshot(`{"v":${version}}`);
    saver.schedule();
    await delay(12);
  }

  await saver.flush();

  assert.ok(events.saves.length >= 1, "at least one hard flush happened mid-typing");
  assert.equal(events.saves.at(-1), `{"v":${version}}`);
  assert.equal(events.states.at(-1), "saved");
});

test("a failing save reports the error and keeps content until a retry succeeds", async () => {
  let failures = 1;
  const { saver, events, setSnapshot } = makeSaver({
    savePage: async () => {
      if (failures > 0) {
        failures -= 1;
        throw new Error("disk busy");
      }
      events.saves.push("retry-ok");
    },
  });

  setSnapshot('{"kind":"draft"}');
  saver.setPersisted("");
  saver.schedule();

  await saver.flush();
  assert.equal(events.states.includes("error"), true);
  assert.equal(events.saves.length, 0);

  await saver.flush();
  assert.deepEqual(events.saves, ["retry-ok"]);
  assert.equal(events.states.at(-1), "saved");
});

test("flush without changes performs no save", async () => {
  const { saver, events, setSnapshot } = makeSaver();
  setSnapshot('{"v":1}');
  saver.setPersisted('{"v":1}');

  await saver.flush();

  assert.deepEqual(events.saves, []);
  assert.equal(events.states.at(-1), "saved");
});
