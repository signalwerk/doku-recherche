# Project guidance

This repository publishes the static website and miniCMS admin for the
Dokumentationsstelle für historische Recherchen. Node.js 24 or newer is
required.

## Ownership boundaries

- `cms.config.yml` is the only editable CMS configuration.
- `content/` contains committed complete YAML records and published media.
- `site/` owns Astro routes, the React renderer, project preview, styles, and
  the static `/admin/` host.
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
- Public routes are derived from `content_id`, `parent_id`, and `slug`. Route
  hierarchy errors and duplicate paths must fail the build.
- Persist image identity as `{hash, filename}`. Resolved `src` values are
  transient and must never be written to YAML.
- Hidden nodes remain selectable in authoring but are absent publicly.

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
