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

        // GitHub media values are repository paths below each upload field's
        // media_folder; serve them at the same path below the site base.
        const mediaFolders = new Set(
          Object.values(config.node_types).flatMap((type: any) =>
            typeof type.connector === "string"
              ? []
              : Object.values<any>(type.fields ?? {}).flatMap((field) =>
                  ["image", "file"].includes(field.widget) &&
                  typeof field.media_folder === "string"
                    ? [field.media_folder]
                    : []
                )
          )
        );
        for (const folder of mediaFolders) {
          await cp(
            path.join(projectRoot, folder),
            path.join(outputDirectory, folder),
            { recursive: true, force: true, errorOnExist: false }
          ).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") throw error;
          });
        }
      }
    }
  };
}
