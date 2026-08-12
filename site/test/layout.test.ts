import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/components"
);
const constrainedWidth =
  "width: min(calc(100% - (2 * var(--gutter))), var(--content-width));";

test("the page canvas is fluid while chrome and default grids stay constrained", async () => {
  const [pageStyles, gridStyles] = await Promise.all([
    readFile(path.join(componentsRoot, "Page/Page.scss"), "utf8"),
    readFile(path.join(componentsRoot, "Grid/Grid.scss"), "utf8")
  ]);

  assert.match(pageStyles, /\.page\s*{[^}]*width:\s*100%;/s);
  const header = /\.site-header\s*{([^}]*)}/s.exec(pageStyles)?.[1] ?? "";
  const footer = /\.site-footer\s*{([^}]*)}/s.exec(pageStyles)?.[1] ?? "";
  const defaultGrid = /\.content-grid--default\s*{([^}]*)}/s.exec(gridStyles)?.[1] ?? "";
  assert.ok(header.includes(constrainedWidth));
  assert.ok(footer.includes(constrainedWidth));
  assert.ok(defaultGrid.includes(constrainedWidth));
});

test("full-width grids use the fluid canvas without a content-width cap", async () => {
  const gridStyles = await readFile(
    path.join(componentsRoot, "Grid/Grid.scss"),
    "utf8"
  );
  const rule = /\.content-grid--full-width\s*{([^}]*)}/s.exec(gridStyles)?.[1] ?? "";
  assert.match(rule, /width:\s*calc\(100% - \(2 \* var\(--gutter\)\)\);/);
  assert.doesNotMatch(rule, /max-width|transform/);
});

test("body paragraphs use the configured asymmetric vertical rhythm", async () => {
  const textStyles = await readFile(
    path.join(componentsRoot, "Text/Text.scss"),
    "utf8"
  );
  const paragraph = /\.prose p\s*{([^}]*)}/s.exec(textStyles)?.[1] ?? "";

  assert.match(paragraph, /margin:\s*0\.65em 0 1\.1em;/);
});

test("accordion summaries use a leading disclosure triangle", async () => {
  const accordionStyles = await readFile(
    path.join(componentsRoot, "Accordion/Accordion.scss"),
    "utf8"
  );
  const summary = /\.accordion > summary\s*{([^}]*)}/s.exec(accordionStyles)?.[1] ?? "";

  assert.match(summary, /grid-template-columns:\s*auto 1fr;/);
  assert.match(accordionStyles, /\.accordion > summary::before\s*{[^}]*clip-path:\s*polygon\(/s);
  assert.match(accordionStyles, /\.accordion\[open\] > summary::before\s*{[^}]*transform:\s*rotate\(90deg\);/s);
  assert.doesNotMatch(accordionStyles, /content:\s*["'][+−]["']/);
});
