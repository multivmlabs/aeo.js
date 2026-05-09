# Vite Integration Guide

Complete guide for integrating aeo.js with Vite to optimize your site for AI-powered search engines.

## Prerequisites

- **Vite**: 4.0 or higher
- **Node.js**: 18.0 or higher
- **Framework**: Works with React, Vue, Svelte, Solid, or vanilla JS

## Installation

### Step 1: Install aeo.js

```bash
npm install aeo.js
# or
yarn add aeo.js
# or
pnpm add aeo.js
```

### Step 2: Add Plugin to Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { aeoVitePlugin } from 'aeo.js/vite';

export default defineConfig({
  plugins: [
    aeoVitePlugin({
      title: 'My Vite Site',
      description: 'Built with Vite and optimized for AI discovery',
      url: 'https://mysite.com',
      keywords: ['vite', 'fast', 'modern'],
    }),
  ],
});
```

### Step 3: Build and Verify

```bash
npm run build
```

Check generated files in `dist`:
- `dist/llms.txt`
- `dist/robots.txt`
- `dist/sitemap.xml`

## Framework-Specific Setup

### React + Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { aeoVitePlugin } from 'aeo.js/vite';

export default defineConfig({
  plugins: [
    react(),
    aeoVitePlugin({
      title: 'My React App',
      url: 'https://myapp.com',
      description: 'React application optimized for AI',
    }),
  ],
});
```

### Vue + Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { aeoVitePlugin } from 'aeo.js/vite';

export default defineConfig({
  plugins: [
    vue(),
    aeoVitePlugin({
      title: 'My Vue App',
      url: 'https://myapp.com',
      description: 'Vue application with AEO',
    }),
  ],
});
```

### Svelte + Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { aeoVitePlugin } from 'aeo.js/vite';

export default defineConfig({
  plugins: [
    svelte(),
    aeoVitePlugin({
      title: 'My Svelte App',
      url: 'https://myapp.com',
    }),
  ],
});
```

## Configuration

### Basic Configuration

```typescript
aeoVitePlugin({
  title: string;              // Required
  url: string;                // Required  
  description?: string;
  keywords?: string[];
  language?: string;
})
```

### Advanced Configuration

```typescript
aeoVitePlugin({
  // Basic info
  title: 'My Vite Site',
  url: 'https://mysite.com',
  description: 'Lightning-fast web application',
  
  // SEO
  keywords: ['vite', 'performance', 'modern-web'],
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
      description: 'Welcome to our app',
      priority: 1.0,
    },
    {
      path: '/features',
      title: 'Features',
      description: 'App features',
      priority: 0.9,
    },
  ],
  
  // Path filtering
  excludePaths: [
    '/admin/*',
    '/_dist/*',
  ],
})
```

## Adding Metadata

### React with Helmet

```bash
npm install react-helmet-async
```

```typescript
// App.tsx
import { Helmet } from 'react-helmet-async';

export default function App() {
  return (
    <>
      <Helmet>
        <title>My App</title>
        <meta name="description" content="App description" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'My App',
            url: 'https://myapp.com',
          })}
        </script>
      </Helmet>
      <main>{/* App content */}</main>
    </>
  );
}
```

### Vue with useHead

```bash
npm install @unhead/vue
```

```vue
<script setup lang="ts">
import { useHead } from '@unhead/vue';

useHead({
  title: 'My Vue App',
  meta: [
    { name: 'description', content: 'App description' },
  ],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'My Vue App',
      }),
    },
  ],
});
</script>

<template>
  <div>
    <h1>My App</h1>
  </div>
</template>
```

### Svelte with svelte:head

```svelte
<svelte:head>
  <title>My Svelte App</title>
  <meta name="description" content="App description" />
  {@html `
    <script type="application/ld+json">
      ${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'My Svelte App',
      })}
    <\/script>
  `}
</svelte:head>

<main>
  <h1>My App</h1>
</main>
```

## Best Practices

### 1. Environment Variables

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  plugins: [
    aeoVitePlugin({
      title: 'My Site',
      url: mode === 'production'
        ? 'https://mysite.com'
        : 'http://localhost:5173',
      generateSitemap: mode === 'production',
    }),
  ],
}));
```

### 2. Multi-Page Applications

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/index.html'),
        blog: resolve(__dirname, 'blog/index.html'),
      },
    },
  },
  plugins: [
    aeoVitePlugin({
      title: 'My Site',
      url: 'https://mysite.com',
      customPages: [
        { path: '/', title: 'Home', priority: 1.0 },
        { path: '/about', title: 'About', priority: 0.8 },
        { path: '/blog', title: 'Blog', priority: 0.9 },
      ],
    }),
  ],
});
```

### 3. Asset Optimization

```typescript
export default defineConfig({
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
  plugins: [
    aeoVitePlugin({ /* config */ }),
  ],
});
```

### 4. Custom Build Output

```typescript
export default defineConfig({
  build: {
    outDir: 'build',  // Custom output directory
  },
  plugins: [
    aeoVitePlugin({
      title: 'My Site',
      url: 'https://mysite.com',
      // Files will be generated in 'build' directory
    }),
  ],
});
```

## Deployment

### Static Hosting (Netlify, Vercel)

1. Build your app:
```bash
npm run build
```

2. Deploy `dist` folder

3. Verify files at:
- `https://yoursite.com/llms.txt`
- `https://yoursite.com/sitemap.xml`

### GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Docker

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Troubleshooting

### Plugin Not Running

**Problem**: AEO files not generated.

**Solution**: Ensure plugin is in `plugins` array:
```typescript
export default defineConfig({
  plugins: [
    aeoVitePlugin({ /* config */ }),  // Must be here
  ],
});
```

### Wrong Output Directory

**Problem**: Files generated in wrong location.

**Solution**: Match build.outDir:
```typescript
export default defineConfig({
  build: {
    outDir: 'dist',  // Default
  },
  plugins: [
    aeoVitePlugin({ /* config */ }),
  ],
});
```

### HMR Issues

**Problem**: Hot module reload not working with AEO.

**Solution**: AEO only runs on build, not during dev. This is expected.

### Path Resolution in SPAs

**Problem**: Routes not found in sitemap (SPA mode).

**Solution**: List routes explicitly:
```typescript
aeoVitePlugin({
  customPages: [
    { path: '/', title: 'Home' },
    { path: '/about', title: 'About' },
    { path: '/contact', title: 'Contact' },
  ],
})
```

## Examples

### React SPA with Routing

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    aeoVitePlugin({
      title: 'My React SPA',
      url: 'https://myapp.com',
      customPages: [
        { path: '/', title: 'Home' },
        { path: '/products', title: 'Products' },
        { path: '/about', title: 'About' },
      ],
    }),
  ],
});
```

### Vue Documentation Site

```typescript
export default defineConfig({
  plugins: [
    vue(),
    aeoVitePlugin({
      title: 'Vue Docs',
      description: 'Complete Vue.js documentation',
      url: 'https://docs.vue-app.com',
      customPages: [
        { path: '/', title: 'Home', priority: 1.0 },
        { path: '/guide', title: 'Guide', priority: 0.9 },
        { path: '/api', title: 'API Reference', priority: 0.9 },
      ],
    }),
  ],
});
```

### Svelte Portfolio

```typescript
export default defineConfig({
  plugins: [
    svelte(),
    aeoVitePlugin({
      title: 'John Doe - Portfolio',
      description: 'Web developer portfolio',
      url: 'https://johndoe.com',
      keywords: ['developer', 'portfolio', 'web-dev'],
      customPages: [
        { path: '/', title: 'Home' },
        { path: '/projects', title: 'Projects' },
        { path: '/blog', title: 'Blog' },
        { path: '/contact', title: 'Contact' },
      ],
    }),
  ],
});
```

## Further Reading

- [Vite Documentation](https://vitejs.dev)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- [Back to Overview](./README.md)

---

**Need help?** [Open an issue](https://github.com/multivmlabs/aeo.js/issues)
