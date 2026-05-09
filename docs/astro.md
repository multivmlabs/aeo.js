# Astro Integration Guide

Complete guide for integrating aeo.js with Astro to optimize your site for AI-powered search engines.

## Prerequisites

- **Astro**: 3.0 or higher
- **Node.js**: 18.0 or higher
- **Package Manager**: npm, yarn, or pnpm

## Installation

### Step 1: Install aeo.js

```bash
npm install aeo.js
# or
yarn add aeo.js
# or
pnpm add aeo.js
```

### Step 2: Add Integration to Astro Config

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { aeoAstroIntegration } from 'aeo.js/astro';

export default defineConfig({
  site: 'https://mysite.com',
  integrations: [
    aeoAstroIntegration({
      title: 'My Astro Site',
      description: 'Built with Astro and optimized for AI discovery',
      url: 'https://mysite.com',
      keywords: ['astro', 'static-site', 'performance'],
    }),
  ],
});
```

### Step 3: Build and Verify

```bash
npm run build
```

Check that these files were generated in your `dist` directory:
- `dist/llms.txt`
- `dist/robots.txt`
- `dist/sitemap.xml`

## Configuration

### Basic Configuration

```typescript
interface AstroAeoConfig {
  title: string;              // Required
  url: string;                // Required (matches site in astro.config)
  description?: string;        // Recommended
  keywords?: string[];
  language?: string;           // Default: 'en'
}
```

### Advanced Configuration

```javascript
export default defineConfig({
  site: 'https://mysite.com',
  integrations: [
    aeoAstroIntegration({
      // Basic info
      title: 'My Astro Site',
      url: 'https://mysite.com',
      description: 'Lightning-fast static site built with Astro',
      
      // SEO
      keywords: ['astro', 'jamstack', 'static-site-generator'],
      language: 'en',
      author: 'Your Name',
      
      // Generation options
      generateLLMsTxt: true,
      generateRobotsTxt: true,
      generateSitemap: true,
      generateJsonLd: true,
      
      // Custom pages
      customPages: [
        {
          path: '/',
          title: 'Home',
          description: 'Welcome to our lightning-fast site',
          priority: 1.0,
        },
        {
          path: '/blog',
          title: 'Blog',
          description: 'Latest articles',
          priority: 0.9,
        },
      ],
      
      // Path filtering
      excludePaths: [
        '/admin/*',
        '/api/*',
      ],
    }),
  ],
});
```

## Content Collections Integration

Astro's content collections work seamlessly with aeo.js:

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: z.string(),
    tags: z.array(z.string()),
  }),
});

export const collections = { blog };
```

## Adding Structured Data

### Page-Level JSON-LD

```astro
---
// src/pages/blog/[slug].astro
import { getEntry } from 'astro:content';

const { slug } = Astro.params;
const post = await getEntry('blog', slug);

const schema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.data.title,
  description: post.data.description,
  datePublished: post.data.pubDate.toISOString(),
  author: {
    '@type': 'Person',
    name: post.data.author,
  },
};
---

<html>
  <head>
    <title>{post.data.title}</title>
    <meta name="description" content={post.data.description} />
    <script type="application/ld+json" set:html={JSON.stringify(schema)} />
  </head>
  <body>
    <article>
      <h1>{post.data.title}</h1>
      <!-- Content -->
    </article>
  </body>
</html>
```

### Global Site Schema

```astro
---
// src/layouts/BaseLayout.astro
const siteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'My Astro Site',
  url: 'https://mysite.com',
  description: 'Lightning-fast static site',
};
---

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <script type="application/ld+json" set:html={JSON.stringify(siteSchema)} />
    <slot name="head" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

## Best Practices

### 1. Organize Content with Collections

```
src/
├── content/
│   ├── blog/
│   │   ├── post-1.md
│   │   └── post-2.md
│   └── docs/
│       ├── getting-started.md
│       └── api-reference.md
└── pages/
    ├── blog/
    │   └── [slug].astro
    └── docs/
        └── [slug].astro
```

### 2. Use Component Islands for Performance

```astro
---
// src/components/SearchWidget.astro
---

<div class="search-widget" client:load>
  <!-- Interactive search -->
</div>
```

### 3. Optimize Images

```astro
---
import { Image } from 'astro:assets';
import coverImage from '../assets/cover.jpg';
---

<Image
  src={coverImage}
  alt="Article cover"
  width={800}
  height={600}
  loading="lazy"
/>
```

### 4. Dynamic Sitemap Generation

Create a dynamic endpoint for sitemaps:

```typescript
// src/pages/sitemap.xml.ts
import { getCollection } from 'astro:content';

export async function GET() {
  const posts = await getCollection('blog');
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>https://mysite.com/</loc>
        <priority>1.0</priority>
      </url>
      ${posts.map(post => `
        <url>
          <loc>https://mysite.com/blog/${post.slug}/</loc>
          <lastmod>${post.data.pubDate.toISOString()}</lastmod>
          <priority>0.8</priority>
        </url>
      `).join('')}
    </urlset>
  `;
  
  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
```

## Deployment

### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
```

### Vercel

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### Cloudflare Pages

Works automatically - just connect your repo!

## Troubleshooting

### Files Not Appearing

**Problem**: AEO files missing from dist.

**Solution**: Ensure integration is added to `astro.config.mjs` and rebuild

### Incorrect Site URL

**Problem**: llms.txt shows wrong URL.

**Solution**: Match `site` in config with `url` in integration:
```javascript
export default defineConfig({
  site: 'https://mysite.com',  // Must match
  integrations: [
    aeoAstroIntegration({
      url: 'https://mysite.com',  // Must match
    }),
  ],
});
```

### Content Collection URLs Wrong

**Problem**: Blog post URLs incorrect in sitemap.

**Solution**: Use trailing slashes consistently:
```astro
<a href={`/blog/${post.slug}/`}>  <!-- With trailing slash -->
```

## Examples

### Blog with Tags

```astro
---
// src/pages/blog/tag/[tag].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  const tags = [...new Set(posts.flatMap(post => post.data.tags))];
  
  return tags.map(tag => ({
    params: { tag },
    props: {
      posts: posts.filter(post => post.data.tags.includes(tag)),
    },
  }));
}

const { tag } = Astro.params;
const { posts } = Astro.props;
---

<html>
  <head>
    <title>Posts tagged "{tag}"</title>
  </head>
  <body>
    <h1>Posts tagged "{tag}"</h1>
    {posts.map(post => (
      <article>
        <h2>{post.data.title}</h2>
      </article>
    ))}
  </body>
</html>
```

### Documentation Site

```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://docs.myproject.com',
  integrations: [
    aeoAstroIntegration({
      title: 'My Project Documentation',
      description: 'Complete reference and guides',
      url: 'https://docs.myproject.com',
      customPages: [
        { path: '/', title: 'Home', priority: 1.0 },
        { path: '/getting-started', title: 'Getting Started', priority: 0.9 },
        { path: '/api', title: 'API Reference', priority: 0.9 },
      ],
    }),
  ],
});
```

## Further Reading

- [Astro Documentation](https://docs.astro.build)
- [Content Collections Guide](https://docs.astro.build/en/guides/content-collections/)
- [Back to Overview](./README.md)

---

**Questions?** [Open an issue](https://github.com/multivmlabs/aeo.js/issues)
