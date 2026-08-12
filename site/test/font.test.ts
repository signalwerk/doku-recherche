import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

test("the project bundles Geist with its named styleset alternates", async () => {
  const [font, license, globalStyles, textStyles] = await Promise.all([
    readFile(
      path.join(
        projectRoot,
        "site/src/assets/fonts/geist/Geist-Variable.woff2"
      )
    ),
    readFile(
      path.join(projectRoot, "site/src/assets/fonts/geist/OFL.txt"),
      "utf8"
    ),
    readFile(
      path.join(projectRoot, "site/src/styles/_global.scss"),
      "utf8"
    ),
    readFile(
      path.join(projectRoot, "site/src/components/Text/Text.scss"),
      "utf8"
    )
  ]);

  assert.equal(font.subarray(0, 4).toString("ascii"), "wOF2");
  assert.equal(
    createHash("sha256").update(font).digest("hex"),
    "4a8dae6146993ea0845255b276891885b3c525875aa8cd8d6c76217a63a5ee6f"
  );
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(license, /Copyright 2024 The Geist Project Authors/);
  assert.match(
    globalStyles,
    /@font-face\s*{[^}]*font-weight:\s*400;[^}]*url\("\.\.\/assets\/fonts\/geist\/Geist-Variable\.woff2"\)/
  );
  assert.match(
    globalStyles,
    /@font-face\s*{[^}]*font-weight:\s*700;[^}]*url\("\.\.\/assets\/fonts\/geist\/Geist-Variable\.woff2"\)/
  );
  assert.match(
    globalStyles,
    /@font-feature-values\s+'Geist'[\s\S]*alt-l:\s*3;[\s\S]*alt-a:\s*1;[\s\S]*alt-r:\s*4;/
  );
  assert.match(
    globalStyles,
    /:root\s*{[\s\S]*font-family:\s*"Geist"[\s\S]*font-variant-alternates:\s*styleset\(alt-l,\s*alt-a,\s*alt-r\);/
  );
  assert.doesNotMatch(textStyles, /font-family:/);
});
