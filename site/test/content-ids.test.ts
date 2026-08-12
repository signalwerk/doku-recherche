import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { CmsConfig, UnknownMapping } from "@signalwerk/minicms/content";

import {
  parseYaml,
  validateSourceConfig
} from "../../miniCMS/core/content.js";
import { ID_PATTERN } from "../../miniCMS/core/id.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

type IdentityLocation = {
  location: string;
  value: string;
};

function visitIdentities(
  value: unknown,
  location: string,
  definitions: IdentityLocation[],
  references: IdentityLocation[],
  isRecordRoot = false
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      visitIdentities(entry, `${location}[${index}]`, definitions, references);
    });
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, entry] of Object.entries(value)) {
    const entryLocation = `${location}.${key}`;
    if (
      typeof entry === "string" &&
      (key === "content_id" || (key === "id" && !isRecordRoot))
    ) {
      definitions.push({ location: entryLocation, value: entry });
    } else if (
      typeof entry === "string" &&
      entry &&
      (key.endsWith("_id") || key === "asset" || key === "ref")
    ) {
      references.push({ location: entryLocation, value: entry });
    }

    visitIdentities(entry, entryLocation, definitions, references);
  }
}

test("all opaque content identities follow the miniCMS ID specification", async () => {
  const config = validateSourceConfig(
    parseYaml(await readFile(path.join(projectRoot, "cms.config.yml"), "utf8"))
  ) as CmsConfig;
  const definitions: IdentityLocation[] = [];
  const references: IdentityLocation[] = [];

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
      const location = `${folder}/${entry.name}`;
      const record = parseYaml(
        await readFile(path.join(projectRoot, location), "utf8")
      );
      visitIdentities(record, location, definitions, references, true);
    }
  }

  for (const identity of [...definitions, ...references]) {
    assert.match(
      identity.value,
      ID_PATTERN,
      `${identity.location} must match ${ID_PATTERN}`
    );
  }

  const owners = new Map<string, string>();
  for (const identity of definitions) {
    assert.equal(
      owners.get(identity.value),
      undefined,
      `${identity.location} duplicates the identity defined at ${owners.get(identity.value)}`
    );
    owners.set(identity.value, identity.location);
  }

  for (const reference of references) {
    assert.ok(
      owners.has(reference.value),
      `${reference.location} references undefined identity ${reference.value}`
    );
  }
});
