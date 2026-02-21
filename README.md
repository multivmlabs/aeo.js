# aeo.js

Answer Engine Optimization for the modern web. Make your site discoverable by AI crawlers and LLMs.

<p align="center">
  <a href="https://ralphstarter.ai/badge"><img src="https://ralphstarter.ai/img/badge-built-with@2x.png" alt="built with ralph-starter" height="28"></a>
</p>

## What is AEO?

Answer Engine Optimization (AEO) is the practice of making your website discoverable and citable by AI-powered answer engines like ChatGPT, Claude, Perplexity, and SearchGPT.

aeo.js auto-generates the files these engines look for and provides a drop-in widget that shows visitors how your site appears to AI.

## Features

- **`llms.txt` / `llms-full.txt`** -- LLM-readable summaries of your site
- **`robots.txt`** -- AI-crawler-aware robots directives
- **`sitemap.xml`** -- Standard sitemap generation
- **`docs.json`** -- Structured documentation manifest
- **`ai-index.json`** -- AI-optimized content index
- **Raw Markdown** -- Per-page `.md` files extracted from your HTML
- **Human/AI Widget** -- Drop-in toggle showing the AI-readable version of any page
- **CLI** -- `npx aeo.js generate` to run standalone

## Supported Frameworks

| Framework | Status | Import |
|-----------|--------|--------|
| Astro | Stable | `aeo.js/astro` |
| Next.js | Stable | `aeo.js/next` |
| Vite / React | Stable | `aeo.js/vite` |
| Nuxt | Stable | `aeo.js/nuxt` |
| Webpack | Stable | `aeo.js/webpack` |
| Any (CLI) | Stable | `npx aeo.js generate` |

## Install

```bash
npm install aeo.js
```

## Quick Start

### Astro

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { aeoAstroIntegration } from 'aeo.js/astro';

export default defineConfig({
  site: 'https://mysite.com',
  integrations: [
    aeoAstroIntegration({
      title: 'My Site',
      description: 'A site optimized for AI discovery',
      url: 'https://mysite.com',
    }),
  ],
});
```

The widget is automatically injected and persists across View Transitions.

### Next.js

Wrap your Next.js config with `withAeo`:

```js
// next.config.mjs
import { withAeo } from 'aeo.js/next';

export default withAeo({
  aeo: {
    title: 'My Site',
    description: 'A site optimized for AI discovery',
    url: 'https://mysite.com',
  },
});
```

After building, run the post-build step to extract content from pre-rendered pages:

```json
{
  "scripts": {
    "postbuild": "node -e \"import('aeo.js/next').then(m => m.postBuild({ title: 'My Site', url: 'https://mysite.com' }))\""
  }
}
```

### Vite (React, Vue, Svelte, etc.)

```js
// vite.config.ts
import { defineConfig } from 'vite';
import { aeoVitePlugin } from 'aeo.js/vite';

export default defineConfig({
  plugins: [
    aeoVitePlugin({
      title: 'My Site',
      description: 'A site optimized for AI discovery',
      url: 'https://mysite.com',
    }),
  ],
});
```

The Vite plugin:
- Generates AEO files on `vite dev` and `vite build`
- Injects the widget automatically
- Serves dynamic `.md` files in dev (extracts content from your running app)
- Detects SPA shells and falls back to client-side DOM extraction

### Nuxt

Add the module to your Nuxt config:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['aeo.js/nuxt'],
  aeo: {
    title: 'My Site',
    description: 'A site optimized for AI discovery',
    url: 'https://mysite.com',
  },
});
```

The Nuxt module:
- Scans your `pages/` directory for routes
- Generates AEO files during dev and production builds
- Scans pre-rendered HTML from `.output/public/` for full page content
- Injects the widget as a client-side Nuxt plugin
- Adds `<link>` and `<meta>` tags for AEO discoverability

### Webpack

```js
// webpack.config.js
const { AeoWebpackPlugin } = require('aeo.js/webpack');

module.exports = {
  plugins: [
    new AeoWebpackPlugin({
      title: 'My Site',
      description: 'A site optimized for AI discovery',
      url: 'https://mysite.com',
    }),
  ],
};
```

## CLI

Run aeo.js from the command line without any framework integration:

```bash
# Generate all AEO files
npx aeo.js generate

# Generate with options
npx aeo.js generate --url https://mysite.com --title "My Site" --out public

# Create a config file
npx aeo.js init

# Check your setup
npx aeo.js check
```

### Commands

| Command | Description |
|---------|-------------|
| `generate` | Generate all AEO files (robots.txt, llms.txt, sitemap.xml, etc.) |
| `init` | Create an `aeo.config.ts` configuration file |
| `check` | Validate your AEO setup and show what would be generated |

### Options

| Flag | Description |
|------|-------------|
| `--out <dir>` | Output directory (default: auto-detected) |
| `--url <url>` | Site URL |
| `--title <title>` | Site title |
| `--no-widget` | Disable widget generation |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

## Configuration

All framework plugins accept the same config object. You can also use `defineConfig` for standalone configs:

```js
import { defineConfig } from 'aeo.js';

export default defineConfig({
  // Required
  title: 'My Site',
  url: 'https://mysite.com',

  // Optional
  description: 'A description of your site',
  contentDir: 'docs',        // Directory with handwritten .md files
  outDir: 'public',          // Output directory for generated files

  // Toggle individual generators
  generators: {
    robotsTxt: true,          // robots.txt
    llmsTxt: true,            // llms.txt
    llmsFullTxt: true,        // llms-full.txt
    rawMarkdown: true,        // Per-page .md files
    manifest: true,           // docs.json
    sitemap: true,            // sitemap.xml
    aiIndex: true,            // ai-index.json
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
    position: 'bottom-right', // 'bottom-left' | 'top-right' | 'top-left'
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

## Widget

The Human/AI widget is a floating toggle that lets visitors switch between the normal page and its AI-readable markdown version. Framework plugins (Astro, Vite, Nuxt) inject it automatically. For Next.js or manual setups:

```tsx
// app/layout.tsx (or any client component)
'use client';
import { useEffect } from 'react';

export function AeoWidgetLoader() {
  useEffect(() => {
    import('aeo.js/widget').then(({ AeoWidget }) => {
      new AeoWidget({
        config: {
          title: 'My Site',
          url: 'https://mysite.com',
          widget: { enabled: true, position: 'bottom-right' },
        },
      });
    });
  }, []);
  return null;
}
```

When a visitor clicks **AI**, the widget:
1. Fetches the `.md` file for the current page
2. Falls back to extracting markdown from the live DOM if no `.md` exists
3. Displays the markdown in a slide-out panel
4. Offers copy-to-clipboard and download actions

## Generated Files

After building, your output directory will contain:

```
public/
  robots.txt          # AI-crawler-aware directives
  llms.txt            # Short LLM-readable summary
  llms-full.txt       # Full content for LLMs
  sitemap.xml         # Standard sitemap
  docs.json           # Documentation manifest
  ai-index.json       # AI-optimized content index
  index.md            # Markdown for /
  about.md            # Markdown for /about
  ...                 # One .md per discovered page
```

## License

MIT
