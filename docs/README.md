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
| Angular | Coming soon | Post-build | 🚧 Beta |
| Webpack | Coming soon | Plugin | 🚧 Beta |

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

All frameworks support these common configuration options:

```typescript
interface AeoConfig {
  // Required
  title: string;           // Your site title
  url: string;            // Your site URL

  // Optional
  description?: string;    // Site description
  keywords?: string[];     // SEO keywords
  author?: string;        // Site author
  language?: string;      // Default: 'en'
  
  // Generation options
  generateLLMsTxt?: boolean;      // Default: true
  generateRobotsTxt?: boolean;    // Default: true
  generateSitemap?: boolean;      // Default: true
  generateJsonLd?: boolean;       // Default: true
  
  // Advanced
  customPages?: PageConfig[];     // Custom page metadata
  excludePaths?: string[];        // Paths to exclude
  includePaths?: string[];        // Specific paths to include
  sitemapPriority?: Record<string, number>;  // Per-page priorities
}
```

## Common Use Cases

### Blog / Content Site
Perfect for making your articles discoverable by AI assistants:

```js
{
  title: 'Tech Blog',
  description: 'In-depth technical tutorials and guides',
  keywords: ['javascript', 'typescript', 'web development'],
  generateJsonLd: true,  // Enable article schema
}
```

### Documentation Site
Optimize technical documentation for AI-powered search:

```js
{
  title: 'API Documentation',
  description: 'Complete API reference and guides',
  customPages: [
    { path: '/api', title: 'API Reference', priority: 1.0 },
    { path: '/guides', title: 'Getting Started Guides', priority: 0.9 },
  ],
}
```

### E-commerce Site
Help AI understand your product catalog:

```js
{
  title: 'Online Store',
  description: 'Quality products delivered fast',
  generateJsonLd: true,  // Enable Product schema
  excludePaths: ['/checkout', '/account'],  // Exclude private pages
}
```

### SaaS Product
Optimize your marketing site and product pages:

```js
{
  title: 'My SaaS Product',
  description: 'The best tool for...',
  customPages: [
    { path: '/', title: 'Home', priority: 1.0 },
    { path: '/features', title: 'Features', priority: 0.9 },
    { path: '/pricing', title: 'Pricing', priority: 0.9 },
    { path: '/docs', title: 'Documentation', priority: 0.8 },
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
