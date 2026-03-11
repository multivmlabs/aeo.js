# aeo.js Demo Projects

Live testing demos for each supported framework. Each demo is a minimal project with 4 pages (Home, About, Products, Contact) integrated with aeo.js.

## Quick Start

From the **repository root**:

```bash
# Install all demos (builds lib first)
npm run demo:install

# Run a specific demo
npm run demo:astro      # Astro       → http://localhost:4321
npm run demo:next       # Next.js     → http://localhost:3100
npm run demo:vite       # Vite+React  → http://localhost:3200
npm run demo:nuxt       # Nuxt        → http://localhost:3300
npm run demo:angular    # Angular     → http://localhost:3400
npm run demo:webpack    # Webpack     → http://localhost:3500

# Build all demos (for CI / verification)
npm run demo:build-all
```

Each `demo:*` script rebuilds the library first, so you always test the latest code.

## How It Works

- Each demo uses `"aeo.js": "file:../../"` in its `package.json`, which symlinks to the repo root
- The symlink resolves `aeo.js/vite`, `aeo.js/astro`, etc. through the `exports` map in the root `package.json` → `dist/*.mjs`
- The `demo:*` scripts run `npm run build` (tsup) before launching the dev server

## Framework Integration Patterns

| Framework | Plugin Import | Integration Method |
|-----------|--------------|-------------------|
| Astro | `aeo.js/astro` | `integrations: [aeoAstroIntegration()]` |
| Next.js | `aeo.js/next` | `export default withAeo({ aeo: {...} })` |
| Vite+React | `aeo.js/vite` | `plugins: [aeoVitePlugin()]` |
| Nuxt | `aeo.js/nuxt` | `modules: ['aeo.js/nuxt']` + `aeo: {}` config |
| Angular | `aeo.js/angular` | `postBuild()` after `ng build` |
| Webpack | `aeo.js/webpack` | `plugins: [new AeoWebpackPlugin()]` |

## What to Verify

After running a demo, check that aeo.js generates:

- `robots.txt` — with AI crawler directives
- `llms.txt` — lightweight site summary for LLMs
- `llms-full.txt` — full markdown content
- `sitemap.xml` — standard sitemap
- Per-page `.md` files — structured markdown for each route
