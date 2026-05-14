# Framework Integration Guides

Comprehensive guides for integrating aeo.js with popular web frameworks to optimize your site for AI search engines like ChatGPT, Claude, Perplexity, and more.

## Overview

aeo.js (Answer Engine Optimization) helps make your website discoverable and understandable by AI-powered search engines. These guides provide step-by-step instructions for integrating aeo.js with your preferred framework.

## What is AEO?

Answer Engine Optimization (AEO) is the process of optimizing your website to be better understood and indexed by AI search engines. Unlike traditional SEO which focuses on keyword rankings, AEO focuses on:

- **Structured content** - Making your content machine-readable
- **Semantic markup** - Using JSON-LD and schema.org
- **AI discovery files** - Generating llms.txt, robots.txt, sitemaps
- **Context signals** - Providing clear page descriptions and metadata

## Supported Frameworks

aeo.js provides native integrations for the following frameworks:

| Framework | Guide | Integration Type | Status |
|-----------|-------|------------------|--------|
| Next.js | [nextjs.md](./nextjs.md) | Plugin + Middleware | ✅ Stable |
| Astro | [astro.md](./astro.md) | Native Integration | ✅ Stable |
| Nuxt | [nuxt.md](./nuxt.md) | Module | ✅ Stable |
| Vite | [vite.md](./vite.md) | Plugin | ✅ Stable |
| Angular | [angular.md](./angular.md) | Post-build | ✅ Stable |
| Webpack | [webpack.md](./webpack.md) | Plugin | ✅ Stable |
| **Vanilla / Static HTML** | [vanilla.md](./vanilla.md) | CLI | ✅ Stable |

## Additional references

- **[CLI Reference](./cli.md)** — every command (`init` · `generate` · `check` · `report`), every flag
- **[Custom JSON-LD Recipes](./json-ld.md)** — copy-paste schemas for FAQ, HowTo, Product, Article, Recipe, Event, VideoObject, BreadcrumbList

## Quick Start

Choose your framework:

### Next.js
```bash
npm install aeo.js
```

```js
// next.config.mjs
import { withAeo } from 'aeo.js/next';

export default withAeo({
  aeo: {
    title: 'My Site',
    description: 'Optimized for AI discovery',
    url: 'https://mysite.com',
  },
});
```

[→ Full Next.js Guide](./nextjs.md)

### Astro
```bash
npm install aeo.js
```

```js
// astro.config.mjs
import { aeoAstroIntegration } from 'aeo.js/astro';

export default defineConfig({
  integrations: [
    aeoAstroIntegration({
      title: 'My Site',
      url: 'https://mysite.com',
    }),
  ],
});
```

[→ Full Astro Guide](./astro.md)

### Nuxt
```bash
npm install aeo.js
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['aeo.js/nuxt'],
  aeo: {
    title: 'My Site',
    url: 'https://mysite.com',
  },
});
```

[→ Full Nuxt Guide](./nuxt.md)

### Vite
```bash
npm install aeo.js
```

```js
// vite.config.ts
import { aeoVitePlugin } from 'aeo.js/vite';

export default defineConfig({
  plugins: [
    aeoVitePlugin({
      title: 'My Site',
      url: 'https://mysite.com',
    }),
  ],
});
```

[→ Full Vite Guide](./vite.md)

### Angular
```bash
npm install aeo.js
```

```json
{
  "scripts": {
    "build": "ng build",
    "postbuild": "node -e \"import('aeo.js/angular').then(m => m.postBuild({ title: 'My App', url: 'https://myapp.com' }))\""
  }
}
```

[→ Full Angular Guide](./angular.md)

### Webpack
```bash
npm install aeo.js
```

```js
// webpack.config.js
const { AeoWebpackPlugin } = require('aeo.js/webpack');

module.exports = {
  plugins: [
    new AeoWebpackPlugin({
      title: 'My Site',
      url: 'https://mysite.com',
    }),
  ],
};
```

[→ Full Webpack Guide](./webpack.md)

### Vanilla JS / Static HTML
No framework? Use the CLI directly on any static site or hand-rolled HTML.

```bash
npx aeo.js generate \
  --url https://mysite.com \
  --title "My Site" \
  --out public
```

[→ Full Vanilla Guide](./vanilla.md) · [→ CLI Reference](./cli.md)

## What Gets Generated?

When you integrate aeo.js, it automatically generates:

### 1. llms.txt
A structured file that AI search engines use to understand your site's content and structure.

```
# My Site

> Optimized for AI discovery

## Site Information
- URL: https://mysite.com
- Description: A comprehensive resource for...
- Last Updated: 2026-05-09

## Pages
- /about: About our company and mission
- /blog: Technical articles and tutorials
- /products: Our product offerings
```

### 2. Enhanced robots.txt
```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

Sitemap: https://mysite.com/sitemap.xml
```

### 3. XML Sitemap
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mysite.com/</loc>
    <lastmod>2026-05-09</lastmod>
    <priority>1.0</priority>
  </url>
  <!-- Additional URLs -->
</urlset>
```

### 4. JSON-LD Structured Data
Automatically injects schema.org structured data into your pages:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "My Site",
  "url": "https://mysite.com",
  "description": "Optimized for AI discovery"
}
```

## Configuration Options

All framework integrations accept the same `AeoConfig` shape:

> All fields are optional in TypeScript, but **`url` should always be set** for production. Omitting it causes `sitemap.xml`, `llms.txt`, and JSON-LD to fall back to `https://example.com` (`validateConfig` will also warn).

```typescript
type AeoConfig = {
  // Strongly recommended
  title?: string;            // Your site title (defaults to "My Site")
  url?: string;              // Your production URL (defaults to "https://example.com")

  // Optional
  description?: string;      // Site description
  contentDir?: string;       // Directory of handwritten markdown
  outDir?: string;           // Where to write AEO files
  pages?: PageEntry[];       // Explicit pages (mostly auto-discovered by plugins)

  // Toggle individual generators (all default true)
  generators?: {
    robotsTxt?: boolean;
    llmsTxt?: boolean;
    llmsFullTxt?: boolean;
    rawMarkdown?: boolean;
    manifest?: boolean;
    sitemap?: boolean;
    aiIndex?: boolean;
    schema?: boolean;
  };

  // robots.txt directives
  robots?: {
    allow?: string[];        // Default: ['/']
    disallow?: string[];
    crawlDelay?: number;     // Seconds
    sitemap?: string;
  };

  // JSON-LD structured data
  schema?: {
    enabled?: boolean;
    organization?: {
      name?: string;
      url?: string;
      logo?: string;
      sameAs?: string[];
    };
    defaultType?: 'Article' | 'WebPage';
  };

  // Open Graph tags
  og?: {
    enabled?: boolean;
    image?: string;
    twitterHandle?: string;
    type?: 'website' | 'article';
  };

  // The Human/AI widget injected into pages
  widget?: {
    enabled?: boolean;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    size?: 'default' | 'small' | 'icon-only';
    theme?: { background?: string; text?: string; accent?: string; badge?: string };
    humanLabel?: string;
    aiLabel?: string;
    showBadge?: boolean;
  };

  // ai-index.json chunking & keyword extraction
  aiIndex?: {
    maxChunkLength?: number; // Default: 2000 (soft limit; splits on paragraph)
    maxKeywords?: number;    // Default: 10
  };
};

type PageEntry = {
  pathname: string;          // e.g. '/about'
  title?: string;
  description?: string;
  content?: string;
};
```

> See [aeojs.org/reference/configuration](https://aeojs.org/reference/configuration/) for the full reference.

## Common Use Cases

### Blog / Content Site
Perfect for making your articles discoverable by AI assistants:

```js
{
  title: 'Tech Blog',
  description: 'In-depth technical tutorials and guides',
  schema: {
    enabled: true,                 // Generates Article schema for FAQ/HowTo patterns
    organization: { name: 'Tech Blog', url: 'https://techblog.com' },
  },
}
```

### Documentation Site
Optimize technical documentation for AI-powered search:

```js
{
  title: 'API Documentation',
  description: 'Complete API reference and guides',
  pages: [
    { pathname: '/api', title: 'API Reference', description: 'Full endpoint reference' },
    { pathname: '/guides', title: 'Getting Started Guides' },
  ],
}
```

### E-commerce Site
Help AI understand your product catalog. Use `robots.disallow` to block crawler access to private routes (it does not remove them from generated AEO files; for those, scope `contentDir` instead):

```js
{
  title: 'Online Store',
  description: 'Quality products delivered fast',
  robots: {
    disallow: ['/checkout', '/account', '/api'],
  },
  schema: {
    enabled: true,
    organization: { name: 'My Store', url: 'https://mystore.com' },
  },
}
```

### SaaS Product
Optimize your marketing site and product pages:

```js
{
  title: 'My SaaS Product',
  description: 'The best tool for...',
  pages: [
    { pathname: '/',         title: 'Home' },
    { pathname: '/features', title: 'Features' },
    { pathname: '/pricing',  title: 'Pricing' },
    { pathname: '/docs',     title: 'Documentation' },
  ],
}
```

## Best Practices

1. **Set accurate metadata** - Provide clear, descriptive titles and descriptions
2. **Use semantic HTML** - Structure your content with proper headings
3. **Include alt text** - Describe images for better AI understanding
4. **Add structured data** - Use JSON-LD for rich content markup
5. **Keep content fresh** - Update llms.txt when content changes
6. **Test with AI** - Ask ChatGPT or Claude about your site
7. **Monitor performance** - Track AI referrals in analytics

## Troubleshooting

### Files not generating?

Check that:
- Build process completes successfully
- Output directory has write permissions
- Configuration is valid

### AI not finding my site?

Ensure:
- llms.txt is publicly accessible at `/llms.txt`
- robots.txt allows AI crawlers
- Sitemap is linked in robots.txt
- DNS and SSL are properly configured

### Framework-specific issues?

See the detailed framework guides:
- [Next.js Troubleshooting](./nextjs.md#troubleshooting)
- [Astro Troubleshooting](./astro.md#troubleshooting)
- [Nuxt Troubleshooting](./nuxt.md#troubleshooting)
- [Vite Troubleshooting](./vite.md#troubleshooting)

## Migration Guides

### From Manual AEO
If you've been manually creating llms.txt and robots.txt:

1. Remove manual files from your public directory
2. Install and configure aeo.js
3. Run build to generate files automatically
4. Verify generated files match your requirements
5. Commit the configuration, delete manual files

### From Other AEO Tools
Coming soon - guides for migrating from other AEO solutions.

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/multivmlabs/aeo.js/issues)
- **Discussions**: [GitHub Discussions](https://github.com/multivmlabs/aeo.js/discussions)
- **Updates**: Follow [@multivmlabs](https://twitter.com/multivmlabs)

## Contributing

Found a better way to configure aeo.js for your framework? Have an example to share?

We welcome contributions! See the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](../LICENSE) for details.

---

**Ready to optimize your site for AI discovery? Choose your framework guide above and get started!**
