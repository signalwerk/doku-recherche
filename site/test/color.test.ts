import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const sourceRoot = path.join(siteRoot, "src");
const accent = "#b92822";

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.(?:astro|css|scss|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  }));
  return nested.flat();
}

function expandedHex(value: string): string {
  const hex = value.toLowerCase();
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.slice(0, 7);
}

function saturation(value: string): number {
  const hex = expandedHex(value);
  const channels = [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16)
  ].map((channel) => channel / 255);
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const lightness = (maximum + minimum) / 2;
  if (maximum === minimum) return 0;
  return (maximum - minimum) / (1 - Math.abs((2 * lightness) - 1));
}

test("the page uses one saturated accent color", async () => {
  const violations: string[] = [];
  for (const file of await sourceFiles(sourceRoot)) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/#[\da-f]{3,8}\b/gi)) {
      const color = expandedHex(match[0]);
      if (saturation(color) > 0.2 && color !== accent) {
        violations.push(`${path.relative(sourceRoot, file)}: ${color}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("selected and marked text is white on black", async () => {
  const globalStyles = await readFile(
    path.join(sourceRoot, "styles/_global.scss"),
    "utf8"
  );
  assert.match(
    globalStyles,
    /::selection\s*{\s*color:\s*var\(--paper-pure\);\s*background:\s*var\(--ink\);\s*}/
  );
  assert.match(
    globalStyles,
    /mark\s*{\s*color:\s*var\(--paper-pure\);\s*background:\s*var\(--ink\);\s*}/
  );
});

test("all anchors share the black underline and red hover treatment", async () => {
  const globalStyles = await readFile(
    path.join(sourceRoot, "styles/_global.scss"),
    "utf8"
  );
  assert.match(
    globalStyles,
    /a\s*{\s*color:\s*var\(--ink\);\s*text-decoration-color:\s*currentColor;\s*text-decoration-line:\s*underline;\s*text-decoration-thickness:\s*0\.1em;\s*text-underline-offset:\s*0\.22em;\s*}/
  );
  assert.match(
    globalStyles,
    /a:hover\s*{\s*color:\s*var\(--accent\);\s*text-decoration-color:\s*currentColor;\s*}/
  );
});
