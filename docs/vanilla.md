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

### Step 1: Initialize a config file (optional but recommended)

```bash
npx aeo.js init
```

This drops an `aeo.config.ts` into your project root with sensible defaults you can edit:

```ts
import { defineConfig } from 'aeo.js';

export default defineConfig({
  title: 'My Site',
  url: 'https://mysite.com',
  description: 'A site optimized for AI discovery',

  generators: {
    robotsTxt: true,
    llmsTxt: true,
    llmsFullTxt: true,
    rawMarkdown: true,
    sitemap: true,
    aiIndex: true,
    schema: true,
  },

  schema: {
    enabled: true,
    organization: { name: 'My Company', url: 'https://mysite.com' },
    defaultType: 'WebPage',
  },
});
```

Don't want a TS config? Skip `init` and pass everything via flags or use `aeo.config.js` / `aeo.config.json` (CLI auto-detects).

### Step 2: Generate the AEO files

```bash
npx aeo.js generate
```

The CLI scans your output directory and emits all enabled files alongside your HTML.

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

The CLI looks for content in two places — set whichever fits your project:

| Source | Config | Use when |
|---|---|---|
| **`contentDir`** | `contentDir: 'docs'` | You have handwritten markdown files (e.g. blog posts in `content/blog/*.md`). aeo.js parses front-matter, scans recursively, and pulls each into the index. |
| **Built HTML in `outDir`** | `outDir: 'public'` | You have a built static site. aeo.js walks the directory for `.html` files, extracts `<title>`, meta description, and rendered text from `<main>` (or the body if no `<main>` exists). |
| **`pages` array** | `pages: [{ pathname: '/about', title: '…' }]` | You want explicit control or have routes that aren't in `contentDir` / `outDir`. Manual entries are merged with auto-discovered ones. |

You can mix all three — `pages` is additive, not exclusive.

## Common Setups

### Hand-rolled HTML site

```text
my-site/
├── index.html
├── about/index.html
├── pricing/index.html
└── aeo.config.ts
```

```ts
// aeo.config.ts
import { defineConfig } from 'aeo.js';

export default defineConfig({
  title: 'My Site',
  url: 'https://mysite.com',
  outDir: '.',                  // The HTML files live at the project root
});
```

```bash
npx aeo.js generate
```

The output files land next to your `index.html`. Ready to deploy.

### Markdown blog (no framework)

```text
my-blog/
├── content/
│   ├── intro-post.md
│   └── second-post.md
├── public/                      # Your existing HTML build
│   ├── index.html
│   └── intro-post/index.html
└── aeo.config.ts
```

```ts
// aeo.config.ts
import { defineConfig } from 'aeo.js';

export default defineConfig({
  title: 'My Blog',
  url: 'https://myblog.dev',
  description: 'Technical articles on the web platform',
  contentDir: 'content',        // Pull post bodies from here
  outDir: 'public',             // Drop generated files here
});
```

aeo.js will read each `.md` file's front-matter (title, description, date), pull its body content, and emit a unified `llms.txt` / `ai-index.json` / `sitemap.xml`.

### Eleventy / Hugo / Jekyll

These SSGs already emit a finished `_site/` or `public/` of HTML. Treat that folder as your `outDir`:

```ts
// aeo.config.ts
export default defineConfig({
  title: 'My Site',
  url: 'https://mysite.com',
  outDir: '_site',              // Eleventy default
  // outDir: 'public',          // Hugo default
  // outDir: '_site',           // Jekyll default
});
```

```jsonc
// package.json
{
  "scripts": {
    "build": "eleventy",        // or hugo / bundle exec jekyll build
    "postbuild": "aeo.js generate"
  }
}
```

`npm` runs `postbuild` automatically after `build`, so `npm run build` produces the full site **and** the AEO files in one step.

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

### Vercel

```jsonc
// vercel.json
{
  "buildCommand": "npm run build && aeo.js generate",
  "outputDirectory": "public"
}
```

### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build && npx aeo.js generate"
  publish = "public"
```

### Cloudflare Pages

In the dashboard, set the build command to `npm run build && npx aeo.js generate` and the output directory to your build folder. No `wrangler.toml` changes needed.

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
      - run: npx aeo.js generate
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public
      - uses: actions/deploy-pages@v4
```

### Plain SFTP / S3 / any host

```bash
npm run build
npx aeo.js generate
# Upload the contents of public/ (or whatever your outDir is) to your host
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
- **Commit `aeo.config.ts`** so contributors run the same configuration. Don't commit the generated files — regenerate them in CI/CD.
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
