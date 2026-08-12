import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.env.SITE_PREVIEW_OUT_DIR
  ? path.resolve(siteDirectory, process.env.SITE_PREVIEW_OUT_DIR)
  : path.resolve(siteDirectory, "../dist/admin");

export default defineConfig({
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: false,
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(siteDirectory, "src/preview/index.tsx"),
      formats: ["iife"],
      name: "SitePreview",
      fileName: () => "preview.js"
    },
    rolldownOptions: {
      transform: {
        // PDF.js contains a Node-only fallback guarded out in browsers. The
        // preview is intentionally an IIFE, where import.meta has no meaning.
        define: {
          "import.meta": "{}"
        }
      },
      external: ["react", "react/jsx-runtime"],
      output: {
        exports: "named",
        globals: {
          react: "miniCMS.React",
          "react/jsx-runtime": "miniCMS.jsxRuntime"
        }
      }
    }
  }
});
