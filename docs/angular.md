# Angular Integration Guide

Make your Angular site discoverable by AI search engines like ChatGPT, Claude, Perplexity, and SearchGPT.

## Prerequisites

- Node.js 18+
- An Angular 15+ project (works with both standalone components and `NgModule` projects)
- TypeScript is the default for Angular

## Installation

```bash
npm install aeo.js
# or
yarn add aeo.js
# or
pnpm add aeo.js
```

## Quick Start

The Angular integration is a **post-build** step: after `ng build` produces your `dist/` output, `aeo.js/angular` scans the emitted HTML and writes AEO files alongside them.

### Step 1: Add the post-build script

```json
{
  "scripts": {
    "build": "ng build",
    "postbuild": "node -e \"import('aeo.js/angular').then(m => m.postBuild({ title: 'My App', url: 'https://myapp.com' }))\""
  }
}
```

npm automatically runs `postbuild` after `build`, so a single `npm run build` produces the Angular bundle **and** the AEO files.

### Step 2: Build and verify

```bash
npm run build
```

You should now have these files inside your Angular `outputPath` (typically `dist/<project>/browser` for Angular 17+):

- `robots.txt` — AI crawler directives
- `llms.txt` — short summary for LLMs
- `llms-full.txt` — full content dump
- `sitemap.xml` — sitemap
- `ai-index.json` — chunked content for embedding
- `docs.json` — site manifest
- `schema.json` — JSON-LD structured data (when `schema.enabled`)
- Per-page `.md` files (when `generators.rawMarkdown` is enabled)

## Configuration

### Basic Configuration

```typescript
type AeoConfig = {
  title: string;              // Required
  url: string;                // Required (production URL)
  description?: string;        // Recommended
  outDir?: string;             // Output directory (defaults to detected Angular dist)
};
```

### Advanced Configuration

```json
{
  "scripts": {
    "postbuild": "node ./scripts/aeo.mjs"
  }
}
```

```js
// scripts/aeo.mjs
import { postBuild } from 'aeo.js/angular';

await postBuild({
  title: 'My App',
  description: 'An Angular app optimized for AI discovery',
  url: 'https://myapp.com',

  generators: {
    robotsTxt: true,
    llmsTxt: true,
    llmsFullTxt: true,
    sitemap: true,
    aiIndex: true,
    schema: true,
    rawMarkdown: true,
  },

  schema: {
    enabled: true,
    organization: {
      name: 'My Company',
      url: 'https://myapp.com',
    },
  },

  aiIndex: {
    maxChunkLength: 2000,
    maxKeywords: 10,
  },
});
```

### Programmatic Generation

If you want full control over when generation runs (custom build pipelines, monorepos, CI scripts):

```js
import { generate } from 'aeo.js/angular';

await generate({
  title: 'My App',
  url: 'https://myapp.com',
  outDir: 'dist/my-app/browser',
});
```

### Inject the Widget

Optionally inject the Human/AI widget script into your built `index.html`:

```js
import { postBuild } from 'aeo.js/angular';

await postBuild({
  title: 'My App',
  url: 'https://myapp.com',
  injectWidget: true,
  widget: {
    enabled: true,
    position: 'bottom-right',
    size: 'small',
  },
});
```

## How It Works

1. `ng build` produces a static `dist/<project>/browser` directory.
2. The post-build hook fires; aeo.js walks the directory for `*.html` files.
3. For each page it extracts the `<title>`, meta description, and rendered text content.
4. It writes the AEO files (`llms.txt`, `sitemap.xml`, etc.) into the same `dist` directory.

For projects using **Angular Universal** (SSR) or **prerendering**, the prerendered HTML is what gets scanned — which is exactly the content AI crawlers see, so generation is accurate.

## Common Setups

### Angular 17+ Standalone Components

No special configuration needed. The post-build script reads whatever HTML Angular emits.

### Angular 16 and Below (`NgModule`)

Same setup — the post-build script is build-pipeline-agnostic.

### Multi-project Workspaces

If your workspace has multiple Angular projects, point `outDir` at each one's output directory:

```js
// scripts/aeo-all.mjs
import { postBuild } from 'aeo.js/angular';

for (const project of ['app-a', 'app-b']) {
  await postBuild({
    title: `My ${project}`,
    url: `https://${project}.example.com`,
    outDir: `dist/${project}/browser`,
  });
}
```

### Angular with SSR / Prerendering

Make sure the post-build script runs **after** prerendering, not after the initial `ng build`:

```json
{
  "scripts": {
    "build": "ng build && ng run my-app:prerender",
    "postbuild": "node -e \"import('aeo.js/angular').then(m => m.postBuild({ title: 'My App', url: 'https://myapp.com' }))\""
  }
}
```

## Best Practices

- **Set `url` to your production hostname.** It seeds `sitemap.xml`, absolute URLs in `llms.txt`, and JSON-LD.
- **Prerender as many routes as you can.** AEO can only describe what's in the emitted HTML; client-side-only routes are invisible.
- **Add `pages` for runtime-only routes.** When prerendering isn't feasible, list them explicitly so they still appear in `sitemap.xml`:

  ```js
  await postBuild({
    title: 'My App',
    url: 'https://myapp.com',
    pages: [
      { pathname: '/', title: 'Home' },
      { pathname: '/pricing', title: 'Pricing' },
    ],
  });
  ```
- **Verify after deploy.** Visit `https://myapp.com/llms.txt`, `/robots.txt`, and `/sitemap.xml`.

## Troubleshooting

### `outDir` not found
The post-build step tries to detect your Angular output directory (typically `dist/<project>/browser`). If your workspace uses a non-standard layout, pass `outDir` explicitly:
```js
postBuild({ title: 'My App', url: 'https://myapp.com', outDir: 'public' });
```

### `sitemap.xml` only contains the root URL
Your build produced no per-page HTML — likely an SPA without prerendering. Either enable Angular prerendering or supply `pages` explicitly (see above).

### `llms.txt` text is empty
The extractor strips scripts and boilerplate, prefers `<main>`. If your Angular template renders everything inside a custom root without `<main>`, AEO content extraction may produce empty pages. Wrap your routed view in `<main>`:
```html
<main>
  <router-outlet></router-outlet>
</main>
```

## Further Reading

- [aeo.js Reference Configuration](https://aeojs.org/reference/configuration/)
- [Generated Files](https://aeojs.org/features/generated-files/)
- [GEO Audit & Citability](https://aeojs.org/features/audit/)
