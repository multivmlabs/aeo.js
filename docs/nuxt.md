# Nuxt Integration Guide

Complete guide for integrating aeo.js with Nuxt to optimize your site for AI-powered search engines.

## Prerequisites

- **Nuxt**: 3.0 or higher
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

### Step 2: Add Module to Nuxt Config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['aeo.js/nuxt'],
  
  aeo: {
    title: 'My Nuxt Site',
    description: 'Built with Nuxt and optimized for AI discovery',
    url: 'https://mysite.com',

  },
});
```

### Step 3: Build and Verify

```bash
npm run build
```

Check generated files in `.output/public`:
- `.output/public/llms.txt`
- `.output/public/robots.txt`
- `.output/public/sitemap.xml`

## Configuration

### Basic Configuration

The `aeo` block accepts the standard `AeoConfig`. See [README.md](./README.md#configuration-options) for the full reference.

### Advanced Configuration

```typescript
export default defineNuxtConfig({
  modules: ['aeo.js/nuxt'],

  aeo: {
    title: 'My Nuxt Site',
    url: 'https://mysite.com',
    description: 'Server-rendered Vue application',

    // Toggle individual generators (all default true)
    generators: {
      llmsTxt: true,
      llmsFullTxt: true,
      robotsTxt: true,
      sitemap: true,
      aiIndex: true,
      schema: true,
    },

    // Optional explicit page metadata (the module auto-discovers from pages/)
    pages: [
      { pathname: '/',     title: 'Home', description: 'Welcome page' },
      { pathname: '/blog', title: 'Blog', description: 'Latest articles' },
    ],

    // robots.txt — block crawlers from private routes
    robots: {
      allow: ['/'],
      disallow: ['/admin', '/api', '/_nuxt'],
    },

    schema: {
      enabled: true,
      organization: {
        name: 'My Nuxt Site',
        url: 'https://mysite.com',
      },
    },
  },
});
```

## Page Meta & SEO

> `useHead` writes `children` as the script body verbatim — it does **not** escape characters that can terminate the surrounding `<script>` tag. A schema value containing `</script>` (or U+2028/U+2029) would break out and execute as JavaScript. Run the payload through a serializer that escapes those characters first — the helper below is the same `serializeJsonForHtml` aeo.js uses internally ([src/core/schema.ts](https://github.com/multivmlabs/aeo.js/blob/main/src/core/schema.ts)). aeo.js's own injected JSON-LD is already safe; only your custom additions need this.

```ts
// utils/serialize-json-ld.ts
export function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
```

### Using useHead Composable

```vue
<script setup lang="ts">
import { serializeJsonForHtml } from '~/utils/serialize-json-ld';

useHead({
  title: 'My Page Title',
  meta: [
    { name: 'description', content: 'Page description for AI' },
    { name: 'keywords', content: 'nuxt, vue, seo' },
  ],
  script: [
    {
      type: 'application/ld+json',
      children: serializeJsonForHtml({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'My Page Title',
        description: 'Page description',
      }),
    },
  ],
});
</script>

<template>
  <div>
    <h1>My Page</h1>
  </div>
</template>
```

### Dynamic Meta from API

```vue
<script setup lang="ts">
import { serializeJsonForHtml } from '~/utils/serialize-json-ld';

type BlogPost = {
  title: string;
  excerpt: string;
  publishedAt: string;
};

const route = useRoute();
// route.params values are `string | string[]` in Vue Router 4 — narrow before use
const slug = typeof route.params.slug === 'string' ? route.params.slug : route.params.slug[0];
const { data: post } = await useFetch<BlogPost>(`/api/posts/${slug}`);

useHead({
  title: () => `${post.value?.title} | My Blog`,
  meta: [
    { name: 'description', content: () => post.value?.excerpt },
    { property: 'og:title', content: () => post.value?.title },
    { property: 'og:description', content: () => post.value?.excerpt },
  ],
  script: [
    {
      type: 'application/ld+json',
      children: () => serializeJsonForHtml({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.value?.title,
        description: post.value?.excerpt,
        datePublished: post.value?.publishedAt,
      }),
    },
  ],
});
</script>
```

## Content Module Integration

### Setup Nuxt Content

```bash
npm install @nuxt/content
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/content', 'aeo.js/nuxt'],
  
  content: {
    highlight: {
      theme: 'github-dark',
    },
  },
  
  aeo: {
    title: 'My Blog',
    url: 'https://myblog.com',
  },
});
```

### Content-Driven Pages

```vue
<script setup lang="ts">
// pages/blog/[slug].vue
type Article = {
  title: string;
  description: string;
  body: unknown;
};

const { path } = useRoute();
const { data: article } = await useAsyncData<Article>(path, () =>
  queryContent<Article>(path).findOne()
);

// useAsyncData returns Ref<T | null>. If content isn't found, throw 404.
if (!article.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' });
}

useHead({
  title: article.value.title,
  meta: [
    { name: 'description', content: article.value.description },
  ],
});
</script>

<template>
  <article v-if="article">
    <h1>{{ article.title }}</h1>
    <ContentDoc />
  </article>
</template>
```

## Best Practices

### 1. App-Level Configuration

```vue
<!-- app.vue -->
<script setup lang="ts">
useHead({
  titleTemplate: (title) => title ? `${title} | My Site` : 'My Site',
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  ],
});
</script>

<template>
  <NuxtPage />
</template>
```

### 2. Server Routes for Dynamic Sitemaps

```typescript
// server/routes/sitemap.xml.ts
type Post = { slug: string; updatedAt: string | Date };

export default defineEventHandler(async (event) => {
  // $fetch defaults to `T = unknown` — pass the response type explicitly
  // so `.map()` is type-safe under "strict": true.
  const posts = await $fetch<Post[]>('/api/posts');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>https://mysite.com/</loc>
        <priority>1.0</priority>
      </url>
      ${posts.map(post => `
        <url>
          <loc>https://mysite.com/blog/${post.slug}</loc>
          <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
          <priority>0.8</priority>
        </url>
      `).join('')}
    </urlset>
  `;
  
  setHeader(event, 'Content-Type', 'application/xml');
  return sitemap;
});
```

### 3. Environment-Specific Config

```typescript
// nuxt.config.ts
const isProd = process.env.NODE_ENV === 'production';

export default defineNuxtConfig({
  modules: ['aeo.js/nuxt'],
  
  aeo: {
    title: 'My Site',
    url: isProd ? 'https://mysite.com' : 'http://localhost:3000',
    generators: { sitemap: isProd },
  },
});
```

### 4. Composables for Structured Data

```typescript
// composables/useStructuredData.ts
import { serializeJsonForHtml } from '~/utils/serialize-json-ld';

export const useStructuredData = (type: string, data: Record<string, unknown>) => {
  useHead({
    script: [
      {
        type: 'application/ld+json',
        children: serializeJsonForHtml({
          '@context': 'https://schema.org',
          '@type': type,
          ...data,
        }),
      },
    ],
  });
};
```

Usage:
```vue
<script setup lang="ts">
useStructuredData('BlogPosting', {
  headline: 'My Post Title',
  description: 'Post description',
  datePublished: '2026-05-09',
});
</script>
```

## Deployment

### Vercel

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".output/public"
}
```

### Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".output/public"
```

### Node Server

```bash
npm run build
node .output/server/index.mjs
```

## Troubleshooting

### Module Not Found

**Problem**: `Cannot find module 'aeo.js/nuxt'`

**Solution**:
```bash
rm -rf node_modules .nuxt
npm install
```

### Files in Wrong Directory

**Problem**: AEO files in wrong output location.

**Solution**: Check Nuxt version - v3 uses `.output/public`

### SSR vs Static Generation

**Problem**: Different behavior between `nuxt build` and `nuxt generate`.

**Solution**: Use `nuxt generate` for static sites:
```bash
npx nuxi generate
```

## Examples

### Blog with Categories

```vue
<!-- pages/blog/category/[category].vue -->
<script setup lang="ts">
type Post = {
  id: string;
  slug: string;
  title: string;
};

const route = useRoute();
// route.params values are `string | string[]` in Vue Router 4 — narrow before use
const category = typeof route.params.category === 'string'
  ? route.params.category
  : route.params.category[0];
const { data: posts } = await useFetch<Post[]>(`/api/posts?category=${category}`);

useHead({
  title: `${category} Posts`,
  meta: [
    { name: 'description', content: `Browse ${category} articles` },
  ],
});
</script>

<template>
  <div>
    <h1>{{ category }} Posts</h1>
    <article v-for="post in posts ?? []" :key="post.id">
      <NuxtLink :to="`/blog/${post.slug}`">
        {{ post.title }}
      </NuxtLink>
    </article>
  </div>
</template>
```

### E-commerce Product Pages

```vue
<script setup lang="ts">
type Product = {
  name: string;
  description: string;
  image: string;
  price: number;
};

const route = useRoute();
const id = typeof route.params.id === 'string' ? route.params.id : route.params.id[0];
const { data: product } = await useFetch<Product>(`/api/products/${id}`);

useStructuredData('Product', {
  name: product.value?.name,
  description: product.value?.description,
  image: product.value?.image,
  offers: {
    '@type': 'Offer',
    price: product.value?.price,
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
});
</script>
```

## Further Reading

- [Nuxt Documentation](https://nuxt.com/docs)
- [Nuxt Content](https://content.nuxt.com)
- [Nuxt SEO](https://nuxtseo.com)
- [Back to Overview](./README.md)

---

**Need help?** [Open an issue](https://github.com/multivmlabs/aeo.js/issues)
