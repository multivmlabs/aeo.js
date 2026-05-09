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

const nextConfig = {
  // Your existing Next.js config
};

export default withAeo(nextConfig, {
  aeo: {
    title: 'My Next.js Site',
    description: 'Built with Next.js and optimized for AI discovery',
    url: 'https://mysite.com',
    keywords: ['nextjs', 'react', 'typescript'],
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

```typescript
interface NextAeoConfig {
  title: string;              // Required: Your site title
  url: string;                // Required: Your production URL
  description?: string;        // Recommended: Site description
  keywords?: string[];         // SEO keywords
  language?: string;           // Default: 'en'
  author?: string;             // Site author
}
```

### Advanced Configuration

```js
export default withAeo(nextConfig, {
  aeo: {
    // Basic info
    title: 'My Next.js Site',
    url: 'https://mysite.com',
    description: 'Comprehensive resource for...',
    
    // SEO
    keywords: ['nextjs', 'react', 'web development'],
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
        description: 'Welcome to our site',
        priority: 1.0,
      },
      {
        path: '/blog',
        title: 'Blog',
        description: 'Latest articles and tutorials',
        priority: 0.9,
      },
      {
        path: '/docs',
        title: 'Documentation',
        description: 'Complete API reference',
        priority: 0.8,
      },
    ],
    
    // Path filtering
    excludePaths: [
      '/api/*',           // Exclude API routes
      '/admin/*',         // Exclude admin pages
      '/_next/*',         // Exclude Next.js internals
      '/private/*',       // Exclude private pages
    ],
    
    // Sitemap priorities
    sitemapPriority: {
      '/': 1.0,
      '/blog': 0.9,
      '/docs': 0.8,
      '/about': 0.7,
    },
  },
});
```

## App Router Integration

### Adding JSON-LD to Root Layout

```typescript
// app/layout.tsx
import { Metadata } from 'next';

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
            __html: JSON.stringify({
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

export async function generateMetadata({ params }): Promise<Metadata> {
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

export default function BlogPost({ post }) {
  return (
    <>
      <Head>
        <title>{post.title} | My Blog</title>
        <meta name="description" content={post.excerpt} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
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
          <lastmod>${post.updatedAt}</lastmod>
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

export default withAeo(nextConfig, {
  aeo: {
    title: 'My Site',
    url: isProd ? 'https://mysite.com' : 'http://localhost:3000',
    generateSitemap: isProd,  // Only in production
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

**Solution**: Use `customPages` to explicitly list dynamic routes:
```js
customPages: [
  { path: '/blog/post-1', title: 'Post 1' },
  { path: '/blog/post-2', title: 'Post 2' },
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
export default withAeo(nextConfig, {
  aeo: {
    title: 'My Store',
    description: 'Quality products, fast shipping',
    url: 'https://mystore.com',
    excludePaths: [
      '/checkout/*',
      '/account/*',
      '/api/*',
    ],
    customPages: [
      { path: '/', title: 'Home', priority: 1.0 },
      { path: '/products', title: 'Products', priority: 0.9 },
      { path: '/about', title: 'About', priority: 0.7 },
    ],
  },
});
```

### Documentation Site

```typescript
export default withAeo(nextConfig, {
  aeo: {
    title: 'API Documentation',
    description: 'Complete API reference and guides',
    url: 'https://docs.myapi.com',
    keywords: ['api', 'documentation', 'reference'],
    customPages: [
      { path: '/api-reference', title: 'API Reference', priority: 1.0 },
      { path: '/guides', title: 'Guides', priority: 0.9 },
      { path: '/examples', title: 'Examples', priority: 0.8 },
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
