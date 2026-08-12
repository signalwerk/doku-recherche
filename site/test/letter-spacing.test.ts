import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import * as sass from "sass";
import test from "node:test";
import { fileURLToPath } from "node:url";

const stylesRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src"
);

async function styleFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return styleFiles(entryPath);
    return /\.(?:css|scss)$/.test(entry.name) ? [entryPath] : [];
  }));
  return nested.flat();
}

test("project styles use only regular and bold font weights", async () => {
  const files = await styleFiles(stylesRoot);
  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/font-weight\s*:\s*([^;]+);/g)) {
      const weight = (match[1] ?? "").trim();
      if (weight !== "400" && weight !== "700") {
        violations.push(`${path.relative(stylesRoot, file)}: ${weight}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test("extended letter spacing is limited to CSS-uppercase text", () => {
  const css = sass.compile(path.join(stylesRoot, "styles/site.scss"), {
    style: "expanded"
  }).css;
  const violations: string[] = [];

  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (rule[1] ?? "").trim();
    const declarations = rule[2] ?? "";
    const spacingMatch = /letter-spacing\s*:\s*([^;]+);/.exec(declarations);
    const spacing = (spacingMatch?.[1] ?? "").trim();
    if (!spacing || spacing === "0" || spacing === "normal") continue;
    if (spacing.startsWith("-") || !/text-transform\s*:\s*uppercase;/.test(declarations)) {
      violations.push(`${selector}: ${spacing}`);
    }
  }

  assert.deepEqual(violations, []);
});
