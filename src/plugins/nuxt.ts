import { defineNuxtModule, createResolver, addPluginTemplate } from '@nuxt/kit';
import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { extractTextFromHtml, extractTitle, extractDescription } from '../core/html-extract';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';

function scanNuxtPages(rootDir: string): PageEntry[] {
  const pages: PageEntry[] = [];
  const pagesDir = join(rootDir, 'pages');
  if (!existsSync(pagesDir)) return pages;

  function walk(dir: string, base: string): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('.') && !entry.startsWith('_')) {
          walk(fullPath, base);
        } else if (entry.match(/\.(vue|tsx?|jsx?)$/) && !entry.startsWith('_') && !entry.startsWith('[')) {
          const relative = fullPath.slice(base.length);
          let pathname = relative.replace(/\.(vue|tsx?|jsx?)$/, '');
          if (pathname.endsWith('/index')) pathname = pathname.slice(0, -6) || '/';
          pathname = pathname.replace(/\/+/g, '/') || '/';
          const name = entry.replace(/\.(vue|tsx?|jsx?)$/, '');
          pages.push({
            pathname,
            title: name === 'index' ? undefined : name.charAt(0).toUpperCase() + name.slice(1),
          });
        }
      }
    } catch { /* skip */ }
  }

  walk(pagesDir, pagesDir);
  return pages;
}

function scanNuxtBuildOutput(projectRoot: string): PageEntry[] {
  const pages: PageEntry[] = [];
  const outputDir = join(projectRoot, '.output', 'public');
  if (!existsSync(outputDir)) return pages;

  function walk(dir: string, basePath: string = ''): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('_') && !entry.startsWith('.') && entry !== 'assets') {
          walk(fullPath, `${basePath}/${entry}`);
        } else if (entry === 'index.html' || (entry.endsWith('.html') && entry !== '200.html' && entry !== '404.html')) {
          const html = readFileSync(fullPath, 'utf-8');
          const title = extractTitle(html);
          const description = extractDescription(html);
          const textContent = extractTextFromHtml(html);
          let pathname: string;
          if (entry === 'index.html') {
            pathname = basePath || '/';
          } else {
            pathname = `${basePath}/${entry.replace('.html', '')}`;
          }
          pages.push({
            pathname,
            title,
            description,
            content: textContent,
          });
        }
      }
    } catch { /* skip */ }
  }

  walk(outputDir);
  return pages;
}

export interface ModuleOptions extends AeoConfig {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'aeo',
    configKey: 'aeo',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {},
  setup(options: ModuleOptions, nuxt: any) {
    const { resolve } = createResolver(import.meta.url);

    const discoveredPages = scanNuxtPages(nuxt.options.rootDir);

    const resolvedConfig = resolveConfig({
      ...options,
      contentDir: options.contentDir || 'content',
      outDir: options.outDir || (nuxt.options.dev ? 'public' : '.output/public'),
      pages: [...(options.pages || []), ...discoveredPages],
    });

    // Dev: generate on build start (public/ doesn't get wiped)
    nuxt.hook('build:before', async () => {
      if (!nuxt.options.dev) return;

      console.log('[aeo.js] Generating AEO files...');

      const outputPath = join(nuxt.options.rootDir, resolvedConfig.outDir);
      if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
      }

      try {
        const result = await generateAEOFiles(resolvedConfig);
        if (result.files.length > 0) console.log(`[aeo.js] Generated ${result.files.length} files`);
        if (result.errors.length > 0) console.error('[aeo.js] Errors:', result.errors);
      } catch (error) {
        console.error('[aeo.js] Failed to generate AEO files:', error);
      }
    });

    // Production: generate after Nitro build with pre-rendered HTML content
    nuxt.hook('nitro:build:public-assets', async (nitro: any) => {
      console.log('[aeo.js] Generating AEO files for production...');

      const outputDir = nitro?.options?.output?.publicDir || join(nuxt.options.rootDir, '.output/public');

      // Scan pre-rendered HTML for actual content
      const buildPages = scanNuxtBuildOutput(nuxt.options.rootDir);
      if (buildPages.length > 0) {
        console.log(`[aeo.js] Discovered ${buildPages.length} pre-rendered pages`);
      }

      // Merge: build output pages (with content) + file-scanned pages + user-provided pages
      const allPages = [...buildPages, ...discoveredPages, ...(options.pages || [])];

      // Deduplicate by pathname, preferring entries that have content
      const pageMap = new Map<string, PageEntry>();
      for (const page of allPages) {
        const existing = pageMap.get(page.pathname);
        if (!existing || (page.content && !existing.content)) {
          pageMap.set(page.pathname, page);
        }
      }

      // Apply defaults for root page
      for (const page of pageMap.values()) {
        if (page.pathname === '/' && !page.title && options.title) {
          page.title = options.title;
        }
        if (!page.description && options.description) {
          page.description = options.description;
        }
      }

      const prodConfig = resolveConfig({
        ...options,
        outDir: options.outDir || outputDir,
        pages: Array.from(pageMap.values()),
      });

      if (!existsSync(prodConfig.outDir)) {
        mkdirSync(prodConfig.outDir, { recursive: true });
      }

      try {
        const result = await generateAEOFiles(prodConfig);
        if (result.files.length > 0) console.log(`[aeo.js] Generated ${result.files.length} files for production`);
        if (result.errors.length > 0) console.error('[aeo.js] Errors:', result.errors);
      } catch (error) {
        console.error('[aeo.js] Failed to generate production AEO files:', error);
      }
    });

    // Dev: watch content directory for changes
    if (nuxt.options.dev) {
      nuxt.hook('builder:watch', async (_event: string, path: string) => {
        if ((path.startsWith(resolvedConfig.contentDir) || path.startsWith('/' + resolvedConfig.contentDir)) && (path.endsWith('.md') || path.endsWith('.yml') || path.endsWith('.yaml'))) {
          console.log('[aeo.js] Content changed, regenerating AEO files...');

          try {
            const result = await generateAEOFiles(resolvedConfig);
            if (result.files.length > 0) console.log(`[aeo.js] Regenerated ${result.files.length} files`);
            if (result.errors.length > 0) console.error('[aeo.js] Errors during regeneration:', result.errors);
          } catch (error) {
            console.error('[aeo.js] Failed to regenerate AEO files:', error);
          }
        }
      });
    }

    // Widget: inject via plugin template (handles .nuxt/ dir timing automatically)
    if (resolvedConfig.widget.enabled) {
      const widgetConfig = {
        title: resolvedConfig.title,
        description: resolvedConfig.description,
        url: resolvedConfig.url,
        widget: resolvedConfig.widget,
      };

      addPluginTemplate({
        filename: 'aeo-widget.client.mjs',
        mode: 'client',
        getContents: () => `
import { AeoWidget } from 'aeo.js/widget';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    try {
      new AeoWidget({ config: ${JSON.stringify(widgetConfig)} });
    } catch (e) {
      console.warn('[aeo.js] Widget initialization failed:', e);
    }
  });
});
`,
      });
    }

    // Add AEO meta tags to head
    nuxt.options.app.head = nuxt.options.app.head || {};
    nuxt.options.app.head.link = nuxt.options.app.head.link || [];
    nuxt.options.app.head.meta = nuxt.options.app.head.meta || [];

    nuxt.options.app.head.link.push(
      { rel: 'alternate', type: 'text/plain', href: '/llms.txt', title: 'LLM Summary' },
      { rel: 'alternate', type: 'text/plain', href: '/llms-full.txt', title: 'Full Content for LLMs' },
      { rel: 'alternate', type: 'application/json', href: '/docs.json', title: 'Documentation Manifest' },
      { rel: 'alternate', type: 'application/json', href: '/ai-index.json', title: 'AI-Optimized Index' }
    );

    nuxt.options.app.head.meta.push(
      { name: 'aeo:title', content: resolvedConfig.title },
      { name: 'aeo:description', content: resolvedConfig.description },
      { name: 'aeo:url', content: resolvedConfig.url }
    );

    // OG / Twitter Card meta tags (site-level defaults)
    if (resolvedConfig.og.enabled) {
      nuxt.options.app.head.meta.push(
        { property: 'og:type', content: resolvedConfig.og.type },
        { property: 'og:title', content: resolvedConfig.title },
        { property: 'og:site_name', content: resolvedConfig.title },
        { property: 'og:url', content: resolvedConfig.url },
        { name: 'twitter:card', content: resolvedConfig.og.image ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title', content: resolvedConfig.title }
      );
      if (resolvedConfig.description) {
        nuxt.options.app.head.meta.push(
          { property: 'og:description', content: resolvedConfig.description },
          { name: 'twitter:description', content: resolvedConfig.description }
        );
      }
      if (resolvedConfig.og.image) {
        nuxt.options.app.head.meta.push(
          { property: 'og:image', content: resolvedConfig.og.image },
          { name: 'twitter:image', content: resolvedConfig.og.image }
        );
      }
      if (resolvedConfig.og.twitterHandle) {
        nuxt.options.app.head.meta.push(
          { name: 'twitter:site', content: resolvedConfig.og.twitterHandle }
        );
      }
    }
  },
});

/**
 * Post-build function that reads pre-rendered HTML from .output/public/
 * and regenerates AEO files with actual page content.
 */
export async function postBuild(config: AeoConfig = {}): Promise<void> {
  const projectRoot = process.cwd();
  const discoveredPages = scanNuxtBuildOutput(projectRoot);

  if (discoveredPages.length > 0) {
    console.log(`[aeo.js] Discovered ${discoveredPages.length} pages from Nuxt build output`);
  }

  for (const page of discoveredPages) {
    if (page.pathname === '/' && !page.title && config.title) {
      page.title = config.title;
    }
    if (!page.description && config.description) {
      page.description = config.description;
    }
  }

  const outputDir = join(projectRoot, '.output', 'public');
  const resolvedConfig = resolveConfig({
    ...config,
    outDir: config.outDir || outputDir,
    pages: [...(config.pages || []), ...discoveredPages],
  });

  const result = await generateAEOFiles(resolvedConfig);
  if (result.files.length > 0) {
    console.log(`[aeo.js] Generated ${result.files.length} files`);
  }
  if (result.errors.length > 0) {
    console.error('[aeo.js] Errors:', result.errors);
  }
}
