# aeo.js Demo Projects

Live testing demos for each supported framework. Each demo has 8 pages (Home, About, Products, Docs, FAQ, Pricing, Blog, Contact) integrated with aeo.js, showcasing schema generation, OG tags, and all AEO file types.

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
- `schema.json` — Schema.org JSON-LD (WebSite, Organization, Article, FAQPage, BreadcrumbList)
- `ai-index.json` — structured AI index
- `docs.json` — documentation manifest
- Per-page `.md` files — structured markdown for each route

Also verify in HTML source:
- JSON-LD `<script type="application/ld+json">` tags (Vite, Astro)
- Open Graph `<meta property="og:*">` tags
- Twitter Card `<meta name="twitter:*">` tags

## Deploying to Vercel

Each demo includes a `vercel.json` that builds the parent aeo.js package first.

To deploy a demo to Vercel:

1. Create a new Vercel project from the GitHub repo
2. Set **Root Directory** to the demo subfolder (e.g., `demo/astro`)
3. Vercel will use the `vercel.json` config for install/build commands
4. Deploy

Each demo can be deployed independently as its own Vercel project.
