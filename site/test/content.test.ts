import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { CmsConfig, UnknownMapping } from "@signalwerk/minicms/content";

import {
  parseYaml,
  validateRecord,
  validateSourceConfig
} from "../../miniCMS/core/content.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

test("the source config and every committed record pass shared validation", async () => {
  const config = validateSourceConfig(
    parseYaml(await readFile(path.join(projectRoot, "cms.config.yml"), "utf8"))
  ) as CmsConfig;
  let recordCount = 0;

  for (const collectionValue of Object.values(config.collections)) {
    const collection = collectionValue as UnknownMapping;
    if ("connector" in collection) continue;

    const folder = String(collection.folder);
    const extension = String(collection.extension ?? "yml");
    const entries = await readdir(path.join(projectRoot, folder), {
      withFileTypes: true
    });

    for (const entry of entries) {
      if (!entry.isFile() || path.extname(entry.name) !== `.${extension}`) {
        continue;
      }

      const source = await readFile(path.join(projectRoot, folder, entry.name), "utf8");
      const record = parseYaml(source);
      validateRecord(record, collection, config);
      assert.equal(
        (record as { id: string }).id,
        path.basename(entry.name, `.${extension}`),
        `${folder}/${entry.name} must use its record id as the filename`
      );
      recordCount += 1;
    }
  }

  assert.ok(recordCount > 0, "at least one valid content record is required");
});
