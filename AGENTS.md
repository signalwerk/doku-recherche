# Project guidance

This repository publishes the static website and miniCMS admin for the
Dokumentationsstelle für historische Recherchen. Node.js 24 or newer is
required.

## Ownership boundaries

- `cms.config.yml` is the only editable CMS configuration.
- `content/` contains committed complete YAML records and published media.
- `site/` owns Astro routes, layouts, the React renderer, project preview,
  styles, and the static `/admin/` host.
- Every configured node type has one project-owned
  `site/src/components/<Type>/<Type>.tsx` renderer and colocated
  `<Type>.scss`; `Unknown` follows the same convention. Keep
  `site/src/render/Renderer.tsx` limited to the registry and recursive
  dispatch, and keep shared slot helpers in `site/src/render/slots.tsx`.
  `site/src/styles/site.scss` is the ordered Sass entry manifest, while
  `_global.scss` and `_typography.scss` own only cross-component foundations.
- Astro document chrome belongs in
  `site/src/layouts/Document/Document.astro`. Public and admin endpoints remain
  route files below `site/src/pages/`; layouts and routes are not CMS node
  renderers.
- `miniCMS/` and `miniCMS-api/` are independent pinned Git submodules. Follow
  their `README.md` and `AGENTS.md`; do not add project behavior to them.
- `miniCMS-api` is loopback-only during development and is never deployed to
  GitHub Pages.
- `DNS.md` and every file below `DATA/` are preserved source material. Do not
  move, rewrite, publish, or delete them unless explicitly requested.

## Content and rendering

- Read YAML through `@signalwerk/minicms/content/fs`; do not parse records in
  website code.
- Static output and the unsaved editor preview use the same recursive React
  renderer and project Sass.
- The website and its isolated preview bundle the project-owned Geist variable
  font from `site/src/assets/fonts/geist/`. Geist is the document-wide family,
  including code surfaces, and the root enables the `alt-l`, `alt-a`, and
  `alt-r` named styleset alternates. Public and preview typography uses only
  font weights `400` and `700`. Letter spacing must never be negative; positive
  letter spacing is allowed only in a rule that also transforms its text to
  uppercase with CSS. `#b92822` is the only saturated accent color; do not add
  darker or alternate reds. Text selection and semantic marked text use white
  on black. All anchors use black text with a current-color underline offset by
  `0.22em` and `0.1em` thick; both text and underline change to the accent on
  hover. The site-header home link is the sole exception and has no underline.
  Component styles must not otherwise override the link treatment. Keep font
  URLs in source Sass so Vite rewrites them correctly for GitHub Pages base
  paths and inlines them into the preview bundle.
- Public routes are derived from `content_id`, `parent_id`, and `slug`. Route
  hierarchy errors and duplicate paths must fail the build.
- Markdown content links persist only the stable page `content_id` as
  `minicms://link/pages/<id>`. Static pages and the live preview derive the
  current base-aware URL from the resolved target and its root-to-parent
  hierarchy, so moving or renaming a page does not change stored Markdown.
  Missing, hidden, malformed, or shortcut targets render as non-links and the
  custom scheme must never reach public HTML.
- Keep the two miniCMS ID categories distinct, but generate both with
  `createId()` from `miniCMS/core/id.js`. Every record's top-level `id` must
  match `^[a-z0-9]{15}$` and equal its YAML filename stem. Every opaque
  identity—each `content_id`, every nested node or image-annotation `id`, tag
  ID, and any relation or hierarchy value targeting one of those
  identities—must follow the same pattern. Generated identity definitions
  must be globally unique; references deliberately reuse an existing
  identity. Never invent any ID from a title, slug, date, counter, or UUID.
- Persist image identity as `{hash, filename}`. Resolved `src` values are
  transient and must never be written to YAML.
- Hidden nodes remain selectable in authoring but are absent publicly.
- PDF viewer canvases have a matching PDF.js text layer at CSS resolution so
  rendered document text remains selectable. Rebuild and cancel both layers
  together on page changes and resizes; the transparent text overlay must not
  alter the visible page or duplicate its accessible page label.
- The page canvas is fluid. Header, footer, and `default` grids share the
  `--content-width` constraint inside the standard gutters; `full_width` grids
  use the complete canvas minus only those gutters. Page records should put
  their primary content inside an explicit grid rather than restoring a width
  cap on `.page`.

## Commands

```sh
npm install
npm install --prefix miniCMS
npm install --prefix miniCMS-api
npm run dev
npm test
npm run test:cms
npm run test:api
npm run build:pages
```

Generated `dist/`, `site/public/admin/preview.js`, dependencies, logs,
environment files, and OS metadata are never committed.
