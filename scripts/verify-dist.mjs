import { access, readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const bibliographyHash = "39d466ebb60819060b79de3cd2d31c5d9bfd670b6664de2a947657c10eaf9cd0";
const bibliographyPath = `media/${bibliographyHash}/zwei-verlage.pdf`;
const required = [
  ".nojekyll",
  "index.html",
  "admin/index.html",
  "admin/cms.config.yml",
  "admin/preview.js",
  bibliographyPath
];

for (const relativePath of required) {
  await access(path.join(outputRoot, relativePath));
}

const configuredBasePath = process.env.SITE_BASE_PATH?.trim() ?? "";
const normalizedBasePath = configuredBasePath && configuredBasePath !== "/"
  ? `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";
const bibliographyBytes = await readFile(path.join(outputRoot, bibliographyPath));
const builtBibliographyHash = createHash("sha256")
  .update(bibliographyBytes)
  .digest("hex");
if (builtBibliographyHash !== bibliographyHash) {
  throw new Error("The published bibliography PDF does not match its content address.");
}

async function findViewerPages(directory) {
  const matches = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...await findViewerPages(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      const html = await readFile(absolutePath, "utf8");
      if (html.includes('data-renderer-type="pdf_viewer"')) {
        matches.push({ absolutePath, html });
      }
    }
  }
  return matches;
}

const viewerPages = await findViewerPages(outputRoot);
if (viewerPages.length !== 1) {
  throw new Error(
    `Expected exactly one rendered PDF viewer page, found ${viewerPages.length}.`
  );
}
const viewerHtml = viewerPages[0].html;
const expectedPdfHref = `${normalizedBasePath}/${bibliographyPath}`;
if (!viewerHtml.includes(`data-pdf-src="${expectedPdfHref}"`)) {
  throw new Error("The PDF viewer page does not reference the base-aware bibliography PDF.");
}

const adminHtml = await readFile(path.join(outputRoot, "admin/index.html"), "utf8");
const expectedFaviconHref = `href="${normalizedBasePath}/favicon.svg"`;
if (!adminHtml.includes(expectedFaviconHref)) {
  throw new Error(
    `admin/index.html does not contain the base-aware favicon ${expectedFaviconHref}`
  );
}

const astroAssets = await readdir(path.join(outputRoot, "_astro"), {
  withFileTypes: true
});
const emittedStyles = (
  await Promise.all(
    astroAssets
      .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
      .map((entry) =>
        readFile(path.join(outputRoot, "_astro", entry.name), "utf8")
      )
  )
).join("\n");
const escapedBasePath = normalizedBasePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const geistAssetPattern = new RegExp(
  `url\\(${escapedBasePath}/_astro/Geist-Variable\\.[A-Za-z0-9_-]+\\.woff2\\)`
);
if (!geistAssetPattern.test(emittedStyles)) {
  throw new Error("Static CSS does not contain the base-aware Geist font asset.");
}

const previewBundle = await readFile(
  path.join(outputRoot, "admin/preview.js"),
  "utf8"
);
if (!previewBundle.includes("data:font/woff2;base64")) {
  throw new Error("The isolated project preview does not inline the Geist font.");
}
if (
  !previewBundle.includes(
    "font-variant-alternates:styleset(alt-l, alt-a, alt-r)"
  )
) {
  throw new Error("The isolated project preview is missing the Geist alternates.");
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
