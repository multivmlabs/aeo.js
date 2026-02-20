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

## Supported Frameworks

| Framework | Status | Import |
|-----------|--------|--------|
| Next.js | Stable | `aeo.js/next` |
| Astro | Stable | `aeo.js/astro` |
| Webpack | Stable | `aeo.js/webpack` |
| Vite | Coming soon | -- |
| Nuxt | Coming soon | -- |

## Install

```bash
npm install aeo.js
```

## Quick Start

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

### Astro

Add the integration in your Astro config:

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

### Webpack

Add the plugin to your webpack config:

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

## Configuration

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

The Human/AI widget is a floating toggle that lets visitors switch between the normal page and its AI-readable markdown version. It's automatically injected by the Astro integration. For Next.js, you can add it manually:

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
3. Displays the markdown with syntax highlighting
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
