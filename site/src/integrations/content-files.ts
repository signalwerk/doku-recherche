import { readFile } from "node:fs/promises";
import path from "node:path";

import type { AstroIntegration } from "astro";
import type { CmsConfig, UnknownMapping } from "@signalwerk/minicms/content";
import {
  parseYaml,
  validateSourceConfig
} from "@signalwerk/minicms/core/content";

export const CONTENT_CHANGED_EVENT = "doku-recherche:content-changed";

interface WatchedCollection {
  extension: string;
  folder: string;
}

async function readSourceConfig(configPath: string): Promise<CmsConfig> {
  return validateSourceConfig(parseYaml(await readFile(configPath, "utf8")));
}

function stringProperty(value: UnknownMapping, key: string): string | undefined {
  const property = value[key];
  return typeof property === "string" && property ? property : undefined;
}

function concreteCollectionFolders(
  config: CmsConfig,
  projectRoot: string
): WatchedCollection[] {
  return Object.values(config.collections).flatMap((definition) => {
    const collection = definition as UnknownMapping;
    const remote =
      stringProperty(collection, "connector") &&
      stringProperty(collection, "remote_collection");
    const folder = stringProperty(collection, "folder");
    if (remote || !folder) return [];

    return [
      {
        extension: `.${(stringProperty(collection, "extension") || "yml").replace(/^\./, "")}`,
        folder: path.resolve(projectRoot, folder)
      }
    ];
  });
}

function isCollectionRecord(
  filename: string,
  collections: WatchedCollection[]
): boolean {
  return collections.some(
    ({ extension, folder }) =>
      path.dirname(filename) === folder && filename.endsWith(extension)
  );
}

export function miniCmsContentIntegration(projectRoot: string): AstroIntegration {
  const configPath = path.join(projectRoot, "cms.config.yml");
  let collections: WatchedCollection[] = [];

  return {
    name: "doku-recherche-content",
    hooks: {
      async "astro:config:setup"() {
        const config = await readSourceConfig(configPath);
        collections = concreteCollectionFolders(config, projectRoot);
      },
      "astro:server:setup"({ logger, server }) {
        const watchedFolders = new Set(collections.map(({ folder }) => folder));
        server.watcher.add([configPath, ...watchedFolders]);

        const refreshWatchedFolders = async () => {
          const config = await readSourceConfig(configPath);
          collections = concreteCollectionFolders(config, projectRoot);
          const additions = collections
            .map(({ folder }) => folder)
            .filter((folder) => !watchedFolders.has(folder));
          for (const folder of additions) watchedFolders.add(folder);
          if (additions.length) server.watcher.add(additions);
        };

        const notify = (filename: string) => {
          for (const environmentName of ["ssr", "prerender"]) {
            server.environments[environmentName]?.hot.send(
              "astro:content-changed",
              {}
            );
          }
          server.environments.client?.hot.send(CONTENT_CHANGED_EVENT, {
            path: path.relative(projectRoot, filename)
          });
        };

        server.watcher.on("all", async (event, filename) => {
          if (!(["add", "change", "unlink"] as string[]).includes(event)) {
            return;
          }

          const absoluteFilename = path.resolve(projectRoot, filename);
          const configChanged = absoluteFilename === configPath;
          if (!configChanged && !isCollectionRecord(absoluteFilename, collections)) {
            return;
          }

          if (configChanged && event !== "unlink") {
            try {
              await refreshWatchedFolders();
            } catch (error: unknown) {
              logger.error(
                `The updated cms.config.yml is invalid: ${error instanceof Error ? error.message : String(error)}`
              );
              return;
            }
          }
          notify(absoluteFilename);
        });
      }
    }
  };
}
