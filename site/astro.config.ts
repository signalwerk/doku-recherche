import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

import { miniCmsContentIntegration } from "./src/integrations/content-files";
import { staticOutputIntegration } from "./src/integrations/static-output";
import { getDevelopmentApiOrigin } from "./src/model/api-origin";

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = realpathSync(path.resolve(siteDirectory, ".."));
// Astro loads mode-specific private variables for server modules later. Load
// the root .env here as well because these values shape the config itself.
const rootEnvironment = { ...loadEnv("", projectRoot, ""), ...process.env };
const developmentApiOrigin = getDevelopmentApiOrigin(
  rootEnvironment.MINICMS_API_URL,
  rootEnvironment.PORT
);

export default defineConfig({
  output: "static",
  outDir: "../dist",
  base: rootEnvironment.SITE_BASE_PATH || "/",
  site: rootEnvironment.SITE_URL || "https://doku-recherche.ch",
  trailingSlash: "ignore",
  integrations: [
    react(),
    miniCmsContentIntegration(projectRoot),
    staticOutputIntegration(projectRoot)
  ],
  vite: {
    envDir: projectRoot,
    define: {
      __PROJECT_ROOT__: JSON.stringify(projectRoot),
      __MINICMS_API_ORIGIN__: JSON.stringify(developmentApiOrigin),
      __MINICMS_ADMIN_PORT__: JSON.stringify(
        rootEnvironment.ADMIN_PORT || "5173"
      ),
      __MINICMS_DEV_SCRIPT_URL__: JSON.stringify(
        rootEnvironment.MINICMS_DEV_SCRIPT_URL || ""
      ),
      __MINICMS_SCRIPT_URL__: JSON.stringify(
        rootEnvironment.MINICMS_SCRIPT_URL || ""
      )
    },
    ssr: {
      noExternal: ["cookie"]
    }
  }
});
