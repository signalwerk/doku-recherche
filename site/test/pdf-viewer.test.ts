import assert from "node:assert/strict";
import test from "node:test";

import {
  lastSpreadStart,
  nextSpreadStart,
  normalizeSpreadStart,
  previousSpreadStart,
  spreadPages,
  spreadStatus
} from "../src/components/PdfViewer/model.ts";

test("the cover is a single-page spread and following pages form pairs", () => {
  assert.deepEqual(spreadPages(1, 54), [1]);
  assert.deepEqual(spreadPages(2, 54), [2, 3]);
  assert.deepEqual(spreadPages(4, 54), [4, 5]);
});

test("the final spread handles even and odd page counts", () => {
  assert.equal(lastSpreadStart(54), 54);
  assert.deepEqual(spreadPages(54, 54), [54]);
  assert.equal(lastSpreadStart(53), 52);
  assert.deepEqual(spreadPages(52, 53), [52, 53]);
});

test("spread navigation stays on valid book spreads", () => {
  assert.equal(nextSpreadStart(1, 54), 2);
  assert.equal(nextSpreadStart(2, 54), 4);
  assert.equal(nextSpreadStart(54, 54), 54);
  assert.equal(previousSpreadStart(2, 54), 1);
  assert.equal(previousSpreadStart(54, 54), 52);
  assert.equal(normalizeSpreadStart(999, 53), 52);
});

test("spread status is concise and localized", () => {
  assert.equal(spreadStatus([1], 54), "Seite 1 von 54");
  assert.equal(spreadStatus([2, 3], 54), "Seiten 2–3 von 54");
});
