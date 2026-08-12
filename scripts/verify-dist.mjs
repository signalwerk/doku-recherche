import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const required = [
  ".nojekyll",
  "index.html",
  "admin/index.html",
  "admin/cms.config.yml",
  "admin/preview.js",
  "media"
];

for (const relativePath of required) {
  await access(path.join(outputRoot, relativePath));
}

const configuredBasePath = process.env.SITE_BASE_PATH?.trim() ?? "";
const normalizedBasePath = configuredBasePath && configuredBasePath !== "/"
  ? `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";
const adminHtml = await readFile(path.join(outputRoot, "admin/index.html"), "utf8");
const expectedFaviconHref = `href="${normalizedBasePath}/favicon.svg"`;
if (!adminHtml.includes(expectedFaviconHref)) {
  throw new Error(
    `admin/index.html does not contain the base-aware favicon ${expectedFaviconHref}`
  );
}

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".txt",
  ".yml",
  ".yaml"
]);
const forbidden = [
  { pattern: /owner\/repository/g, label: "template repository identity" },
  { pattern: /(?:^|[>\"'])Website(?:$|[<\"'])/gm, label: "template site identity" },
  { pattern: /\/Users\//g, label: "local macOS filesystem path" },
  { pattern: /[A-Za-z]:\\Users\\/g, label: "local Windows filesystem path" },
  {
    pattern: /http:\/\/(?:127\.\d+\.\d+\.\d+|localhost|\[?::1\]?):\d+/g,
    label: "loopback development origin"
  }
];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(absolutePath);
      continue;
    }
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const source = await readFile(absolutePath, "utf8");
    for (const check of forbidden) {
      check.pattern.lastIndex = 0;
      if (check.pattern.test(source)) {
        throw new Error(
          `${path.relative(outputRoot, absolutePath)} contains ${check.label}`
        );
      }
    }
  }
}

await scan(outputRoot);
console.log("Verified required Pages artifacts and production boundaries.");
