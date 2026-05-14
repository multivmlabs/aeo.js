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

`postBuild` and `generate` accept the standard `AeoConfig`. The minimum useful shape:

```typescript
type AeoConfig = {
  title?: string;              // Strongly recommended (defaults to "My Site")
  url?: string;                // Strongly recommended (your production URL)
  description?: string;        // Recommended
  outDir?: string;             // Output directory (defaults to detected Angular dist)
};
```

> Although `title` and `url` are optional in the type, omitting `url` causes `sitemap.xml`, `llms.txt`, and JSON-LD to fall back to `https://example.com`. Always set it for production builds. See [README.md](./README.md#configuration-options) for the full reference.

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

### `postBuild` vs `generate`

| Function | Scans build HTML? | Use it when |
|---|---|---|
| `postBuild(config)` | ✅ Yes, plus `src/app/**/*.routes.ts` | You ran `ng build` and want AEO files generated from the actual emitted HTML |
| `generate(config)` | ❌ No — source routes only | Build output isn't available (dev/CI scripts, route discovery only) |

`postBuild` is what you want for almost everything. `generate` is the lower-level escape hatch.

```js
// scripts/aeo-source-only.mjs
import { generate } from 'aeo.js/angular';

await generate({
  title: 'My App',
  url: 'https://myapp.com',
  outDir: 'dist/my-app/browser',
});
```

### Inject the Widget

The Human/AI widget is **injected by default** when `widget.enabled !== false`. The Quick Start example above will already inject it into `index.html`. To customize the widget appearance:

```js
import { postBuild } from 'aeo.js/angular';

await postBuild({
  title: 'My App',
  url: 'https://myapp.com',
  widget: {
    enabled: true,           // default
    position: 'bottom-right',
    size: 'small',
  },
});
```

To **disable** widget injection without touching widget config elsewhere:

```js
await postBuild({
  title: 'My App',
  url: 'https://myapp.com',
  injectWidget: false,
});
```

## How It Works

1. `ng build` produces a static `dist/<project>/browser` directory.
2. The post-build hook fires; aeo.js does **two** scans:
   - Walks the build output for `*.html` files (skipping `404.html` / `500.html`, `assets/`, `media/`). For each page it extracts the `<title>`, meta description, and rendered text content.
   - Walks `src/app` for `*.routes.ts` files and extracts the `path:` values declared in route configs. These add route entries to `sitemap.xml` even when no HTML was prerendered.
3. The two sets are merged: build-output pages (with content) take priority over source-scanned routes.
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

Make sure the post-build script runs **after** prerendering produces the final HTML.

**Angular 17+** (prerendering is configured in `angular.json` under the build target):

```json
{
  "scripts": {
    "build": "ng build",
    "postbuild": "node -e \"import('aeo.js/angular').then(m => m.postBuild({ title: 'My App', url: 'https://myapp.com' }))\""
  }
}
```

**Angular 16 and below** (separate prerender command):

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
- **Prerender as many routes as you can.** Without prerendering, declared routes from `*.routes.ts` still appear in `sitemap.xml` — but `llms.txt` / `ai-index.json` only carry content for pages that produced HTML. Prerendered routes get the full treatment.
- **Add `pages` for routes not declared in `*.routes.ts`.** When the auto-scan misses a route (e.g. it's defined in code, not a route config), list it explicitly:

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
The post-build step reads `angular.json` to detect your output directory (typically `dist/<project>/browser` for Angular 17+, `dist/<project>` for older). If your workspace uses a non-standard layout, pass `outDir` explicitly. Top-level `await` works inside an `.mjs` file or any module with `"type": "module"`:

```js
// scripts/aeo.mjs
import { postBuild } from 'aeo.js/angular';

await postBuild({
  title: 'My App',
  url: 'https://myapp.com',
  outDir: 'public',
});
```

### `sitemap.xml` only contains the root URL
The plugin scans **both** the build output for HTML **and** `src/app/**/*.routes.ts` for declared route paths, so an empty sitemap usually means both are empty:

- No prerendering, **and** no `*.routes.ts` files found (e.g. routes defined inline in components or via `provideRouter([...])` in a non-routes file).
- Fix one of: enable Angular prerendering, move routes into a `*.routes.ts` file, or pass `pages` explicitly (see [Add `pages` for routes not declared](#best-practices) above).

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
