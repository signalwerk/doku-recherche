# Dokumentationsstelle für historische Recherchen

Static Astro website with a project-owned React renderer and a miniCMS editor.
Content lives as YAML and media in this repository; GitHub Pages serves both
the website and `/admin/`.

## Requirements

- Node.js 24 or newer (`.nvmrc` is included)
- Git with submodule support

Install every package boundary after cloning:

```sh
git submodule update --init --recursive
npm install
npm install --prefix miniCMS
npm install --prefix miniCMS-api
```

## Local editing

Start the website, editor provider, and loopback content API together:

```sh
npm run dev
```

The processes are available at:

- Website: <http://127.0.0.1:4321/>
- Editor: <http://127.0.0.1:4321/admin/>
- miniCMS provider: <http://127.0.0.1:5173/>
- Content API readiness: <http://127.0.0.1:8787/api/ready>

The local API writes complete records and media directly to `content/`. It is
unauthenticated by design and refuses non-loopback hosts. Review those working
tree changes before committing, and stop the API before reorganizing the same
content files externally.

Optional root `.env` values include `PORT`, `ADMIN_PORT`, `HOST`,
`MINICMS_API_URL`, `MINICMS_DEV_SCRIPT_URL`, and `MINICMS_SCRIPT_URL`. A remote
content API must use HTTPS.

## Builds and tests

```sh
npm test
npm run test:cms
npm run test:api
npm run build:pages
SITE_BASE_PATH=/doku-recherche SITE_URL=https://signalwerk.github.io npm run build:pages
```

Production output is written to `dist/`. The preview bundle is built after
Astro so it can be added to `dist/admin/` without clearing the site output.

## Deployment and authentication

Pushes to `main` run `.github/workflows/pages.yml`. Configure the repository's
Pages source as **GitHub Actions**. The repository's Pages site uses the custom
domain <https://doku-recherche.ch/>. The build also supports GitHub project-base
output when `SITE_BASE_PATH` and `SITE_URL` are supplied by Pages or locally.

The production editor uses the GitHub connector from `cms.config.yml` and the
central auth worker at `https://auth.signalwerk.workers.dev`. Editing works only
after that worker allowlists the exact browser origin
`https://doku-recherche.ch` and permits the `signalwerk` GitHub identity for
`signalwerk/doku-recherche`. The allowlist value has no trailing path: do not
use `/admin/` or the repository path. No OAuth token or secret belongs in this
repository.

The independent `miniCMS-api` submodule is used only for local editing and is
not part of the Pages artifact.
