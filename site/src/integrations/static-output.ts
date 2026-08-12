import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";
import type { CmsConfig } from "@signalwerk/minicms/content";
import {
  parseYaml,
  validateSourceConfig
} from "@signalwerk/minicms/core/content";

async function readSourceConfig(projectRoot: string): Promise<CmsConfig> {
  const source = await readFile(
    path.join(projectRoot, "cms.config.yml"),
    "utf8"
  );
  return validateSourceConfig(parseYaml(source));
}

export function staticOutputIntegration(projectRoot: string): AstroIntegration {
  return {
    name: "doku-recherche-static-output",
    hooks: {
      async "astro:build:done"({ dir }) {
        const outputDirectory = fileURLToPath(dir);
        await mkdir(outputDirectory, { recursive: true });
        await writeFile(path.join(outputDirectory, ".nojekyll"), "", "utf8");

        const config = await readSourceConfig(projectRoot);
        if (config.connectors.default.name !== "github") return;

        const source = path.join(projectRoot, "content", "media");
        const destination = path.join(outputDirectory, "media");
        await cp(source, destination, {
          recursive: true,
          force: true,
          errorOnExist: false
        }).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
    }
  };
}
