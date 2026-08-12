import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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

test("project styles never use negative letter spacing", async () => {
  const files = await styleFiles(stylesRoot);
  const violations: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (/letter-spacing\s*:\s*-/.test(source)) {
      violations.push(path.relative(stylesRoot, file));
    }
  }

  assert.deepEqual(violations, []);
});
