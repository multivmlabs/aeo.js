# Next.js Integration Guide

Complete guide for integrating aeo.js with Next.js to optimize your site for AI-powered search engines.

## Prerequisites

- **Next.js**: 13.0 or higher (App Router or Pages Router)
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

### Step 2: Update Next.js Configuration

#### For App Router (Next.js 13+)

```js
// next.config.mjs
import { withAeo } from 'aeo.js/next';

export default withAeo({
  // Your existing Next.js config keys live here
  aeo: {
    title: 'My Next.js Site',
    description: 'Built with Next.js and optimized for AI discovery',
    url: 'https://mysite.com',

  },
});
```

#### For Pages Router (Next.js 12)

```js
// next.config.js
const { withAeo } = require('aeo.js/next');

module.exports = withAeo({
  // Your existing Next.js config
  aeo: {
    title: 'My Next.js Site',
    description: 'Built with Next.js and optimized for AI discovery',
    url: 'https://mysite.com',
  },
});
```

### Step 3: Add Post-Build Hook

Add the post-build script to generate AEO files after build:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "postbuild": "node -e \"import('aeo.js/next').then(m => m.postBuild({ title: 'My Site', url: 'https://mysite.com' }))\"",
    "start": "next start"
  }
}
```

### Step 4: Build and Verify

```bash
npm run build
```

Check that these files were generated in your `public` directory:
- `public/llms.txt`
- `public/robots.txt`
- `public/sitemap.xml`

## Configuration

### Basic Configuration

The shape passed under `aeo:` is the standard `AeoConfig`. The wrapping `NextAeoConfig` is just Next's own config plus an `aeo?: AeoConfig` key:

```typescript
type NextAeoConfig = {
  aeo?: AeoConfig;
  // ...all of your normal Next.js config keys (webpack, redirects, etc.)
};
```

See [README.md](./README.md#configuration-options) for the full `AeoConfig` reference.

### Advanced Configuration

```js
export default withAeo({
  // Your existing Next.js config keys live here
  aeo: {
    title: 'My Next.js Site',
    url: 'https://mysite.com',
    description: 'Comprehensive resource for...',

    // Toggle individual generators (all default true)
    generators: {
      llmsTxt: true,
      llmsFullTxt: true,
      robotsTxt: true,
      sitemap: true,
      aiIndex: true,
      schema: true,
    },

    // Explicit page metadata. The plugin auto-discovers pages from the
    // App Router / Pages Router, but you can override or supplement here.
    pages: [
      { pathname: '/',     title: 'Home',           description: 'Welcome to our site' },
      { pathname: '/blog', title: 'Blog',           description: 'Latest articles and tutorials' },
      { pathname: '/docs', title: 'Documentation',  description: 'Complete API reference' },
    ],

    // robots.txt directives — use these to keep crawlers out of private routes
    robots: {
      allow: ['/'],
      disallow: [
        '/api',
        '/admin',
        '/_next',
        '/private',
      ],
    },

    // JSON-LD structured data
    schema: {
      enabled: true,
      organization: {
        name: 'My Company',
        url: 'https://mysite.com',
      },
    },
  },
});
```

## App Router Integration

### Adding JSON-LD to Root Layout

> When you inject JSON-LD via `dangerouslySetInnerHTML`, React does **not** escape characters that can terminate the surrounding `<script>` tag. A schema value containing `</script>` (or U+2028/U+2029) would break out and execute as JavaScript. Run the payload through a serializer that escapes those characters first — this is the same `serializeJsonForHtml` aeo.js uses internally ([src/core/schema.ts](https://github.com/multivmlabs/aeo.js/blob/main/src/core/schema.ts)). aeo.js's own injected JSON-LD is already safe; only your custom additions need this.

```typescript
// app/lib/serialize-json-ld.ts
export function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
```

```typescript
// app/layout.tsx
import { Metadata } from 'next';
import { serializeJsonForHtml } from './lib/serialize-json-ld';

export const metadata: Metadata = {
  title: 'My Next.js Site',
  description: 'Optimized for AI discovery',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonForHtml({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'My Next.js Site',
              url: 'https://mysite.com',
              description: 'Optimized for AI discovery',
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Dynamic Page Metadata

```typescript
// app/blog/[slug]/page.tsx
import { Metadata } from 'next';

// Next.js 14 and below: params is a plain object.
// For Next.js 15+, params is a Promise — see note below.
type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://mysite.com/blog/${params.slug}`,
      type: 'article',
    },
  };
}
```

> **Next.js 15+** introduced async params. Change the type to `{ params: Promise<{ slug: string }> }` and `await` it: `const { slug } = await params;`.

## Pages Router Integration

### Custom _app.tsx

```typescript
// pages/_app.tsx
import type { AppProps } from 'next/app';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="description" content="My Next.js Site" />
        <meta name="keywords" content="nextjs, react, typescript" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
```

### Page-Level SEO

```typescript
// pages/blog/[slug].tsx
import Head from 'next/head';
import { serializeJsonForHtml } from '@/lib/serialize-json-ld';

type BlogPostProps = {
  post: {
    title: string;
    excerpt: string;
    publishedAt: string;
    author: { name: string };
  };
};

export default function BlogPost({ post }: BlogPostProps) {
  return (
    <>
      <Head>
        <title>{post.title} | My Blog</title>
        <meta name="description" content={post.excerpt} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonForHtml({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.excerpt,
              datePublished: post.publishedAt,
              author: {
                '@type': 'Person',
                name: post.author.name,
              },
            }),
          }}
        />
      </Head>
      <article>{/* Post content */}</article>
    </>
  );
}
```

## Best Practices

### 1. Dynamic Sitemap Generation

For sites with many pages, generate sitemaps dynamically:

```typescript
// pages/api/sitemap.xml.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const posts = await getAllPosts();
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${posts.map(post => `
        <url>
          <loc>https://mysite.com/blog/${post.slug}</loc>
          <lastmod>${new Date(post.updatedAt).toISOString()}</lastmod>
          <priority>0.8</priority>
        </url>
      `).join('')}
    </urlset>
  `;
  
  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();
}
```

### 2. Structured Data for Blog Posts

```typescript
const blogPostSchema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.excerpt,
  image: post.coverImage,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt,
  author: {
    '@type': 'Person',
    name: post.author.name,
    url: post.author.url,
  },
  publisher: {
    '@type': 'Organization',
    name: 'My Site',
    logo: {
      '@type': 'ImageObject',
      url: 'https://mysite.com/logo.png',
    },
  },
};
```

### 3. Optimize Static Assets

```typescript
// next.config.mjs
export default withAeo({
  images: {
    domains: ['cdn.mysite.com'],
    formats: ['image/avif', 'image/webp'],
  },
  aeo: {
    // ... config
  },
});
```

### 4. Environment-Specific Configuration

```typescript
// next.config.mjs
const isProd = process.env.NODE_ENV === 'production';

export default withAeo({
  // Your existing Next.js config keys live here
  aeo: {
    title: 'My Site',
    url: isProd ? 'https://mysite.com' : 'http://localhost:3000',
    generators: { sitemap: isProd },  // Only in production
  },
});
```

## Deployment

### Vercel

aeo.js works automatically with Vercel deployments:

1. Push your code to GitHub
2. Connect to Vercel
3. Deploy
4. Files are generated during build

Verify at:
- `https://yoursite.vercel.app/llms.txt`
- `https://yoursite.vercel.app/sitemap.xml`

### Self-Hosted

Ensure the post-build hook runs:

```bash
npm run build
npm run start
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Files Not Generated

**Problem**: llms.txt or sitemap.xml not appearing in public directory.

**Solutions**:
1. Check that `postbuild` script runs: `npm run build` should show aeo.js output
2. Verify Next.js version is 13+
3. Check build output directory permissions
4. Ensure `public` directory exists

### Build Errors

**Problem**: `Cannot find module 'aeo.js/next'`

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Incorrect URLs in Sitemap

**Problem**: Sitemap contains localhost URLs in production.

**Solution**: Set `url` in config to production URL:
```js
url: 'https://mysite.com',  // Not localhost
```

### Missing Pages in Sitemap

**Problem**: Dynamic routes not appearing in sitemap.

**Solution**: Use `pages` to explicitly list dynamic routes:
```js
pages: [
  { pathname: '/blog/post-1', title: 'Post 1' },
  { pathname: '/blog/post-2', title: 'Post 2' },
],
```

## Examples

### Blog with MDX

```typescript
// next.config.mjs
import { withAeo } from 'aeo.js/next';
import mdx from '@next/mdx';

const withMDX = mdx();

export default withAeo(withMDX({
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  aeo: {
    title: 'My Blog',
    description: 'Technical articles and tutorials',
    url: 'https://myblog.com',
  },
}));
```

### E-commerce Site

```typescript
export default withAeo({
  // Your existing Next.js config keys live here
  aeo: {
    title: 'My Store',
    description: 'Quality products, fast shipping',
    url: 'https://mystore.com',
    robots: {
      allow: ['/'],
      disallow: ['/checkout', '/account', '/api'],
    },
    pages: [
      { pathname: '/', title: 'Home' },
      { pathname: '/products', title: 'Products' },
      { pathname: '/about', title: 'About' },
    ],
  },
});
```

### Documentation Site

```typescript
export default withAeo({
  // Your existing Next.js config keys live here
  aeo: {
    title: 'API Documentation',
    description: 'Complete API reference and guides',
    url: 'https://docs.myapi.com',

    pages: [
      { pathname: '/api-reference', title: 'API Reference' },
      { pathname: '/guides', title: 'Guides' },
      { pathname: '/examples', title: 'Examples' },
    ],
  },
});
```

## Testing

### Verify llms.txt

```bash
curl http://localhost:3000/llms.txt
```

Expected output:
```
# My Next.js Site

> Built with Next.js and optimized for AI discovery

## Site Information
- URL: https://mysite.com
...
```

### Test with AI

Ask ChatGPT or Claude:
> "What can you tell me about [your site URL]?"

The AI should be able to reference your llms.txt content.

## Further Reading

- [Next.js Documentation](https://nextjs.org/docs)
- [Structured Data Guide](https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data)
- [Back to Overview](./README.md)

---

**Questions or issues?** [Open an issue on GitHub](https://github.com/multivmlabs/aeo.js/issues)
