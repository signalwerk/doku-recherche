import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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

test("the viewer keeps navigation minimal without an external PDF button", async () => {
  const component = await readFile(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../src/components/PdfViewer/PdfViewer.tsx"
    ),
    "utf8"
  );
  assert.doesNotMatch(component, /PDF öffnen/);
});

test("paired pages touch with one grey divider inside a black outline", async () => {
  const styles = await readFile(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../src/components/PdfViewer/PdfViewer.scss"
    ),
    "utf8"
  );
  assert.match(styles, /\.pdf-viewer__stage\s*{[^}]*gap:\s*0;/s);
  assert.match(styles, /\.pdf-viewer__page\s*{[^}]*border:\s*1px solid var\(--ink\);/s);
  assert.match(
    styles,
    /data-page-count="2"[^}]*\.pdf-viewer__page:first-child\s*{[^}]*border-inline-end-color:\s*var\(--line\);/s
  );
  assert.match(
    styles,
    /data-page-count="2"[^}]*\.pdf-viewer__page \+ \.pdf-viewer__page\s*{[^}]*border-inline-start:\s*0;/s
  );
});
