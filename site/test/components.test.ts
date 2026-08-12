import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseYaml, validateSourceConfig } from "../../miniCMS/core/content.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const componentsDirectory = path.join(projectRoot, "site/src/components");

function componentName(type: string): string {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

test("every configured node type has a colocated React component and Sass file", async () => {
  const config = validateSourceConfig(
    parseYaml(await readFile(path.join(projectRoot, "cms.config.yml"), "utf8"))
  );
  const manifest = await readFile(
    path.join(projectRoot, "site/src/styles/site.scss"),
    "utf8"
  );

  for (const type of Object.keys(config.node_types)) {
    const name = componentName(type);
    const directory = path.join(componentsDirectory, name);
    await access(path.join(directory, name + ".tsx"));
    await access(path.join(directory, name + ".scss"));
    assert.match(
      manifest,
      new RegExp(
        '@use "\\.\\./components/' + name + "/" + name + '";'
      )
    );
  }

  await access(path.join(componentsDirectory, "Unknown/Unknown.tsx"));
  await access(path.join(componentsDirectory, "Unknown/Unknown.scss"));
});
