# Webpack Integration Guide

Make your webpack-built site discoverable by AI search engines like ChatGPT, Claude, Perplexity, and SearchGPT.

## Prerequisites

- Node.js 18+
- A project using webpack 5+
- TypeScript is optional but recommended

## Installation

```bash
npm install aeo.js
# or
yarn add aeo.js
# or
pnpm add aeo.js
```

## Quick Start

aeo.js ships a webpack plugin that hooks into the `afterEmit` lifecycle, scans the emitted HTML assets in your output directory, and generates AEO files alongside them.

### Step 1: Register the plugin

```js
// webpack.config.js
const { AeoWebpackPlugin } = require('aeo.js/webpack');

module.exports = {
  // ...your existing webpack config
  plugins: [
    new AeoWebpackPlugin({
      title: 'My Site',
      description: 'Optimized for AI discovery',
      url: 'https://mysite.com',
    }),
  ],
};
```

### Step 2: Build and verify

```bash
npm run build
```

You should now have these files in your webpack `output.path` directory:

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

The plugin accepts the standard `AeoConfig`. The minimum useful shape:

```typescript
type AeoConfig = {
  title?: string;              // Strongly recommended (defaults to "My Site")
  url?: string;                // Strongly recommended (your production URL)
  description?: string;        // Recommended
  outDir?: string;             // Where to write AEO files (defaults to webpack output.path)
  contentDir?: string;         // Optional handwritten-markdown source
};
```

> Although `title` and `url` are optional in the type, omitting `url` causes `sitemap.xml`, `llms.txt`, and JSON-LD to fall back to `https://example.com`. Always set it for production builds. See [README.md](./README.md#configuration-options) for the full reference.

### Advanced Configuration

```js
const { AeoWebpackPlugin } = require('aeo.js/webpack');

module.exports = {
  plugins: [
    new AeoWebpackPlugin({
      title: 'My Site',
      url: 'https://mysite.com',
      description: 'Lightning-fast site built with webpack',

      generators: {
        robotsTxt: true,
        llmsTxt: true,
        llmsFullTxt: true,
        sitemap: true,
        aiIndex: true,
        schema: true,
        rawMarkdown: true,
      },

      robots: {
        allow: ['/'],
        disallow: ['/admin'],
      },

      schema: {
        enabled: true,
        organization: {
          name: 'My Company',
          url: 'https://mysite.com',
        },
      },

      aiIndex: {
        maxChunkLength: 2000,
        maxKeywords: 10,
      },
    }),
  ],
};
```

### Factory Form

If you prefer a function-style API:

```js
const { createAeoWebpackPlugin } = require('aeo.js/webpack');

module.exports = {
  plugins: [
    createAeoWebpackPlugin({
      title: 'My Site',
      url: 'https://mysite.com',
    }),
  ],
};
```

## How It Works

1. webpack runs your build and emits HTML assets to `output.path`.
2. The `afterEmit` hook fires; the plugin walks `compilation.assets` for every `.html` file (skipping `404.html` / `500.html`).
3. For each page it extracts the `<title>`, meta description, and text content.
4. It then writes the AEO files to the same output directory.

Because the plugin reads the rendered HTML, it works with any HTML output webpack can produce — including `html-webpack-plugin`, `mini-html-webpack-plugin`, multi-page apps, and prerendered SPAs.

## Common Setups

### `html-webpack-plugin`

```js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { AeoWebpackPlugin } = require('aeo.js/webpack');

module.exports = {
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html', filename: 'index.html' }),
    new HtmlWebpackPlugin({ template: './src/about.html', filename: 'about/index.html' }),
    new AeoWebpackPlugin({
      title: 'My Site',
      url: 'https://mysite.com',
    }),
  ],
};
```

### Multi-page SPA

For SPAs with multiple entry points or prerendered routes, you can supplement the auto-discovered pages with `pages` to give better titles and descriptions:

```js
new AeoWebpackPlugin({
  title: 'My SPA',
  url: 'https://mysite.com',
  pages: [
    { pathname: '/', title: 'Home', description: 'Welcome' },
    { pathname: '/pricing', title: 'Pricing', description: 'Plans and tiers' },
  ],
});
```

## Best Practices

- **Set `url` to your production hostname.** It seeds `sitemap.xml`, absolute URLs in `llms.txt`, and JSON-LD.
- **Run AEO generation only in production builds.** Gate the plugin behind your `NODE_ENV`:

  ```js
  const isProd = process.env.NODE_ENV === 'production';

  module.exports = {
    plugins: [
      ...(isProd ? [new AeoWebpackPlugin({ title: 'My Site', url: 'https://mysite.com' })] : []),
    ],
  };
  ```
- **Verify after deploy.** Visit `https://mysite.com/llms.txt`, `/robots.txt`, and `/sitemap.xml` to confirm the AEO files actually shipped.

## Troubleshooting

### No AEO files in the output directory
The plugin only acts on HTML assets. If your webpack config produces no `.html` files (pure asset pipeline), use the CLI form instead:
```bash
npx aeo.js generate --url https://mysite.com --title "My Site" --out dist
```

### `llms.txt` is empty
The plugin scans `compilation.assets` after `afterEmit`. If you use a custom emitter or post-processing that runs later, the plugin may run before your HTML is emitted. Move `AeoWebpackPlugin` to be the **last** plugin in your `plugins` array.

### Sitemap is missing pages
Multi-page SPAs that render at runtime are invisible at build time. Add the routes via the `pages` option (shown above) so the sitemap picks them up.

## Further Reading

- [aeo.js Reference Configuration](https://aeojs.org/reference/configuration/)
- [Generated Files](https://aeojs.org/features/generated-files/)
- [GEO Audit & Citability](https://aeojs.org/features/audit/)
