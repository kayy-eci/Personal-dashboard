import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeWindowBounds } from "../dist-electron/electron/window-state.js";

test("sanitizeWindowBounds keeps complete valid bounds", () => {
  const bounds = sanitizeWindowBounds({
    width: 1120,
    height: 760,
    x: 40,
    y: -12,
    maximized: false,
  });
  assert.deepEqual(bounds, { width: 1120, height: 760, x: 40, y: -12 });
});

test("sanitizeWindowBounds keeps a maximized flag only when true", () => {
  const bounds = sanitizeWindowBounds({
    width: 900,
    height: 600,
    maximized: true,
  });
  assert.deepEqual(bounds, { width: 900, height: 600, maximized: true });
  // A corrupt flag must not discard otherwise-valid restored bounds.
  assert.deepEqual(sanitizeWindowBounds({ width: 900, height: 600, maximized: "yes" }), {
    width: 900,
    height: 600,
  });
});

test("sanitizeWindowBounds rejects sizes under the minimum window size", () => {
  assert.equal(sanitizeWindowBounds({ width: 200, height: 600 }), null);
  assert.equal(sanitizeWindowBounds({ width: 900, height: 100 }), null);
  assert.equal(sanitizeWindowBounds({ width: 900, height: "600" }), null);
  assert.equal(sanitizeWindowBounds(null), null);
  assert.equal(sanitizeWindowBounds("1120x760"), null);
});

test("sanitizeWindowBounds drops a lone coordinate instead of the whole state", () => {
  const bounds = sanitizeWindowBounds({ width: 900, height: 600, x: 10 });
  assert.deepEqual(bounds, { width: 900, height: 600 });
});
