# Vanilla JS / Static HTML Guide

Use aeo.js with a plain HTML site, a hand-rolled JavaScript bundle, or any static-site generator (Eleventy, Hugo, Jekyll, Pelican, etc.) — no framework required. Everything works through the `aeo.js` CLI.

## Prerequisites

- Node.js 18+
- A folder with HTML files (your built site) — anywhere on disk

## Installation

aeo.js can be invoked one-off via `npx` (zero install) or added as a dev-dependency for repeatable builds.

```bash
# Zero-install (latest)
npx aeo.js generate --url https://mysite.com --title "My Site"

# Or install as a dev-dependency
npm install --save-dev aeo.js
# yarn add -D aeo.js
# pnpm add -D aeo.js
```

## Quick Start

### Step 1: Initialize a config file (optional)

```bash
npx aeo.js init
```

This drops an `aeo.config.ts` into your project root with sensible defaults. The generated file matches the template in [src/cli.ts](https://github.com/multivmlabs/aeo.js/blob/main/src/cli.ts):

```ts
import { defineConfig } from 'aeo.js';

export default defineConfig({
  // Required
  title: 'My Site',
  url: 'https://example.com',

  // Optional
  description: 'A site optimized for AI discovery',

  // Toggle individual generators
  generators: {
    robotsTxt: true,
    llmsTxt: true,
    llmsFullTxt: true,
    rawMarkdown: true,
    manifest: true,
    sitemap: true,
    aiIndex: true,
  },

  // Customize robots.txt
  robots: {
    allow: ['/'],
    disallow: ['/admin'],
    crawlDelay: 0,
  },

  // Widget configuration
  widget: {
    enabled: true,
    position: 'bottom-right',
    humanLabel: 'Human',
    aiLabel: 'AI',
    showBadge: true,
    theme: {
      background: 'rgba(18, 18, 24, 0.9)',
      text: '#C0C0C5',
      accent: '#E8E8EA',
      badge: '#4ADE80',
    },
  },
});
```

> **Need JSON-LD?** The template intentionally omits `generators.schema` and the top-level `schema` block — add them when you want structured-data generation:
>
> ```ts
> generators: { /* …, */ schema: true },
> schema: {
>   enabled: true,
>   organization: { name: 'My Company', url: 'https://mysite.com' },
>   defaultType: 'WebPage',
> },
> ```

> **Important:** the standalone CLI does **not** currently load `aeo.config.{ts,js}` — it reads CLI flags + defaults only. The config file scaffolded here is intended to be imported into a framework config (e.g. `import aeoConfig from './aeo.config'` inside `vite.config.ts`) and passed to the framework plugin. For raw CLI usage on a static site, **always pass `--url` and `--title` on the command line**.

### Step 2: Generate the AEO files

Pass your URL and title as flags. The CLI scans your output directory and emits all enabled files alongside your HTML.

```bash
npx aeo.js generate \
  --url https://mysite.com \
  --title "My Site" \
  --out public
```

For a one-line invocation that's easy to commit, drop it into a script:

```jsonc
// package.json
{
  "scripts": {
    "build:aeo": "aeo.js generate --url https://mysite.com --title \"My Site\" --out public"
  }
}
```

### Step 3: Verify

```bash
ls public/   # or wherever your site is

robots.txt
llms.txt
llms-full.txt
sitemap.xml
ai-index.json
docs.json
schema.json
```

Visit `https://yoursite.com/llms.txt` after deploying to confirm.

## How aeo.js Discovers Your Pages

The CLI itself only sees what you pass via flags. The richer `contentDir` / `pages` options are honored when you call the generators programmatically or via a framework integration — they're documented here so you know what's available:

| Source | Option | Use when |
|---|---|---|
| **Built HTML in `outDir`** | `--out public` (CLI) or `outDir: 'public'` (programmatic) | You have a built static site. aeo.js walks the directory for `.html` files, extracts `<title>`, meta description, and rendered text from `<main>` (or the body if no `<main>` exists). |
| **`contentDir`** | `contentDir: 'docs'` (programmatic) | You have handwritten markdown files (e.g. blog posts in `content/blog/*.md`). aeo.js parses front-matter, scans recursively, and pulls each into the index. |
| **`pages` array** | `pages: [{ pathname: '/about', title: '…' }]` (programmatic) | Explicit control for runtime-only routes. Manual entries are merged with auto-discovered ones. |

The CLI exposes `--out` for `outDir`; the richer options (`contentDir`, `pages`) require either a framework integration or calling the package's API directly:

```js
// scripts/aeo.mjs
import { generateAEOFiles, resolveConfig } from 'aeo.js';

await generateAEOFiles(resolveConfig({
  title: 'My Site',
  url: 'https://mysite.com',
  contentDir: 'content',
  outDir: 'public',
  pages: [{ pathname: '/', title: 'Home', description: 'Welcome' }],
}));
```

## Common Setups

### Hand-rolled HTML site

```text
my-site/
├── index.html
├── about/index.html
└── pricing/index.html
```

```jsonc
// package.json
{
  "scripts": {
    "build:aeo": "aeo.js generate --url https://mysite.com --title \"My Site\" --out ."
  }
}
```

```bash
npm run build:aeo
```

The output files land next to your `index.html`. Ready to deploy.

### Eleventy / Hugo / Jekyll

These SSGs already emit a finished `_site/` or `public/` of HTML — point `--out` at that folder.

```jsonc
// package.json
{
  "scripts": {
    "build": "eleventy",
    "postbuild": "aeo.js generate --url https://mysite.com --title \"My Site\" --out _site"
  }
}
```

For Hugo, use `--out public`; for Jekyll, `--out _site`. `npm` runs `postbuild` automatically after `build`, so `npm run build` produces the full site **and** the AEO files in one step.

### Markdown blog (no framework)

The CLI's `--out` flag covers the built-HTML case, but to pull `.md` front-matter and bodies from a `contentDir`, drop a small Node script next to your build:

```text
my-blog/
├── content/
│   ├── intro-post.md
│   └── second-post.md
├── public/                      # Your existing HTML build
│   ├── index.html
│   └── intro-post/index.html
└── scripts/aeo.mjs
```

```js
// scripts/aeo.mjs
import { generateAEOFiles, resolveConfig } from 'aeo.js';

await generateAEOFiles(resolveConfig({
  title: 'My Blog',
  url: 'https://myblog.dev',
  description: 'Technical articles on the web platform',
  contentDir: 'content',        // pull post bodies from here
  outDir: 'public',             // drop generated files here
}));
```

```jsonc
// package.json
{
  "scripts": {
    "build:aeo": "node scripts/aeo.mjs"
  }
}
```

`generateAEOFiles` reads each `.md` file's front-matter, pulls its body content, and emits a unified `llms.txt` / `ai-index.json` / `sitemap.xml`.

### Single-file landing page

Even a single `index.html` benefits from AEO files. The minimum:

```bash
npx aeo.js generate \
  --url https://mysite.com \
  --title "My Site" \
  --out .
```

You get `robots.txt`, `llms.txt`, `sitemap.xml`, and `schema.json` next to your HTML.

## Auditing without generating

`aeo.js` ships an audit command that scores your AEO readiness without writing any files. Useful in CI:

```bash
npx aeo.js check
```

Output:

```text
[aeo.js] AEO Configuration Check
────────────────────────────────────────
  Framework:    static
  Output dir:   public
  Title:        My Site
  URL:          https://mysite.com
  Widget:       enabled

  Generators:
    + robots.txt
    + llms.txt
    + llms-full.txt
    + sitemap.xml
    + ai-index.json
    + schema.json

  Config file: found

═══════════════════════════════════════
  GEO Readiness Score: 84/100 (Good)
═══════════════════════════════════════
  ✓ AI Access:           20/20
  ✓ Content Structure:   18/20
  ✓ Schema Presence:     20/20
  ⚠ Meta Quality:        12/20
  ⚠ Citability:          14/20
```

JSON output for scripting:

```bash
npx aeo.js check --json > audit.json
```

See [cli.md](./cli.md) for the full CLI reference.

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/aeo-check.yml
name: AEO readiness
on:
  pull_request:
    paths:
      - 'content/**'
      - 'public/**'
      - 'aeo.config.ts'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx aeo.js check --json | tee audit.json
      - run: |
          SCORE=$(jq '.audit.score' audit.json)
          if [ "$SCORE" -lt 70 ]; then
            echo "GEO score below 70 — failing build" >&2
            exit 1
          fi
```

## Deployment

The generated files are plain static assets — deploy them with whatever you'd already use.

> **Always pass `--out`** matching your build output directory. Without it the CLI defaults to `dist/` for non-framework projects, so AEO files would land outside the directory you actually deploy. Each snippet below uses `--out public`; change it to match your build (e.g. `_site` for Eleventy/Jekyll, `dist` for Vite, `public` for Hugo).

### Vercel

```jsonc
// vercel.json
{
  "buildCommand": "npm run build && npx aeo.js generate --url https://mysite.com --title \"My Site\" --out public",
  "outputDirectory": "public"
}
```

### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build && npx aeo.js generate --url https://mysite.com --title \"My Site\" --out public"
  publish = "public"
```

### Cloudflare Pages

In the dashboard, set the build command to `npm run build && npx aeo.js generate --url https://mysite.com --title "My Site" --out public` and the output directory to `public`. No `wrangler.toml` changes needed.

### GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci && npm run build
      - run: npx aeo.js generate --url https://mysite.com --title "My Site" --out public
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public
      - uses: actions/deploy-pages@v4
```

### Plain SFTP / S3 / any host

```bash
npm run build
npx aeo.js generate --url https://mysite.com --title "My Site" --out public
# Upload the contents of public/ to your host
rsync -avz --delete public/ user@host:/var/www/mysite/
```

## Adding the Widget

The widget is the small Human ↔ AI toggle that lets visitors see how AI engines view your site. To add it to a static HTML site:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Site</title>
  </head>
  <body>
    <!-- your content -->

    <script type="module">
      import { AeoWidget } from 'https://esm.sh/aeo.js/widget';
      new AeoWidget({
        config: {
          title: 'My Site',
          url: 'https://mysite.com',
          widget: { enabled: true, position: 'bottom-right', size: 'small' },
        },
      });
    </script>
  </body>
</html>
```

Or, if you're bundling your own JS:

```bash
npm install aeo.js
```

```js
import { AeoWidget } from 'aeo.js/widget';

new AeoWidget({
  config: {
    title: 'My Site',
    url: 'https://mysite.com',
  },
});
```

Disable widget generation entirely:

```bash
npx aeo.js generate --no-widget
```

## Best Practices

- **Always set `url`.** Without it, `sitemap.xml`, `llms.txt`, and JSON-LD fall back to `https://example.com` and the audit will flag it.
- **Run `aeo.js generate` after your HTML build, not before.** Otherwise the discovery scan finds nothing to index.
- **Commit your `build:aeo` script in `package.json`** so contributors run the same flags. Don't commit the generated files — regenerate them in CI/CD.
- **Use `aeo.js check` in PRs.** Fail the build if the score drops.

## Troubleshooting

### `llms.txt` is empty / has no pages
The CLI didn't find any HTML or markdown. Check:
- `outDir` points at your built site (containing `*.html` files), not your source
- `contentDir` exists and has `.md` / `.mdx` files
- Or pass `pages: [...]` explicitly in config

### `sitemap.xml` only has the root URL
Same as above — the CLI didn't find page-level HTML/markdown. If your site is a SPA without prerendered routes, list them via `pages: [...]` in the config.

### `aeo.js check` reports low Citability score
Citability scores how easily an LLM can quote your page. Common boosts: add FAQ headings (`## What is X?`), include statistics with numbers, use short topic-focused paragraphs. See the full breakdown in [Generated Files](https://aeojs.org/features/audit/).

### CLI says "Unknown framework"
That's expected — you're not using one. The CLI defaults to a generic static-site flow, which is exactly what you want here.

## Further Reading

- [CLI Reference](./cli.md) — every flag, every command
- [Custom JSON-LD Recipes](./json-ld.md) — FAQ, HowTo, Product, Article snippets
- [aeo.js Reference Configuration](https://aeojs.org/reference/configuration/)
- [Back to Overview](./README.md)

---

**Need help?** [Open an issue](https://github.com/multivmlabs/aeo.js/issues)
