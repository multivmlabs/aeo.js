// @ts-expect-error @nuxt/kit is an optional peer dep, types resolved at runtime in Nuxt projects
import { defineNuxtModule, createResolver, addPluginTemplate } from '@nuxt/kit';
import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
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

function extractText(html: string): string {
  let text = html;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  const mainMatch = text.match(/<main[^>]*>([\s\S]*)<\/main>/i);
  if (mainMatch) {
    text = mainMatch[1];
  } else {
    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  }
  text = text.replace(/<a[^>]+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, url, inner) => {
    if (/<(?:h[1-6]|div|p|section)[^>]*>/i.test(inner)) {
      const cleanInner = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `\n[${cleanInner.slice(0, 120).trim()}](${url})\n`;
    }
    return `[${inner}](${url})`;
  });
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n');
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');
  text = text.replace(/<a[^>]+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  text = text.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  text = text.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n\n> $1\n\n');
  text = text.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');
  text = text.replace(/<br[^>]*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<\/?(?:div|section|article|header|main|aside|figure|figcaption|table|thead|tbody|tr|td|th|ul|ol|dl|dt|dd)[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&copy;/g, '(c)');
  text = text.replace(/[\u{1F1E0}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '');
  text = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/\[[\s\n]+/g, '[').replace(/[\s\n]+\]/g, ']');
  text = text.replace(/(#{2,6})\s*\n+\s*/g, '$1 ');
  text = text.replace(/^#{2,6}\s*$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim().slice(0, 8000);
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
          const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
          const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
          const textContent = extractText(html);
          let pathname: string;
          if (entry === 'index.html') {
            pathname = basePath || '/';
          } else {
            pathname = `${basePath}/${entry.replace('.html', '')}`;
          }
          pages.push({
            pathname,
            title: titleMatch?.[1]?.split('|')[0]?.trim(),
            description: descMatch?.[1],
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
        if (path.includes(resolvedConfig.contentDir) && (path.endsWith('.md') || path.endsWith('.yml') || path.endsWith('.yaml'))) {
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
