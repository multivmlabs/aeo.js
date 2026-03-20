import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry, ResolvedAeoConfig } from '../types';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { extractTextFromHtml, extractTitle, extractDescription, htmlToMarkdown } from '../core/html-extract';
import { generateSiteSchemas, generatePageSchemas, generateJsonLdScript } from '../core/schema';
import { generateOGTagsHtml } from '../core/opengraph';

interface ScannedPage extends PageEntry {
  /** Absolute path to the HTML file on disk */
  filePath: string;
}

function scanBuiltPages(dir: string, _baseUrl: string): ScannedPage[] {
  const pages: ScannedPage[] = [];

  function walk(currentDir: string): void {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== '_astro') {
          walk(fullPath);
        } else if (entry === 'index.html' || (entry.endsWith('.html') && entry !== '404.html' && entry !== '500.html')) {
          try {
            const html = readFileSync(fullPath, 'utf-8');
            const title = extractTitle(html);
            const description = extractDescription(html);
            const textContent = extractTextFromHtml(html);

            let pathname: string;
            const relative = fullPath.slice(dir.length);
            if (entry === 'index.html') {
              pathname = '/' + relative.replace(/\/?index\.html$/, '');
              if (pathname !== '/') pathname = pathname.replace(/\/$/, '');
            } else {
              pathname = '/' + relative.replace(/\.html$/, '');
            }
            // Ensure clean pathname
            pathname = pathname.replace(/\/+/g, '/') || '/';

            pages.push({
              pathname,
              title,
              description,
              content: textContent,
              filePath: fullPath,
            });
          } catch { /* skip unreadable files */ }
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  walk(dir);
  return pages;
}

function scanDevPages(pagesDir: string): PageEntry[] {
  const pages: PageEntry[] = [];

  function walk(currentDir: string, base: string): void {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('.') && !entry.startsWith('_')) {
          walk(fullPath, base);
        } else if (entry.endsWith('.astro') || entry.endsWith('.md') || entry.endsWith('.mdx')) {
          if (entry.startsWith('404') || entry.startsWith('500') || entry.startsWith('[')) continue;
          const relative = fullPath.slice(base.length);
          let pathname = '/' + relative.replace(/\.(astro|md|mdx)$/, '');
          if (pathname.endsWith('/index')) pathname = pathname.slice(0, -6) || '/';
          pathname = pathname.replace(/\/+/g, '/') || '/';
          const name = entry.replace(/\.(astro|md|mdx)$/, '');
          pages.push({
            pathname,
            title: name === 'index' ? undefined : name.charAt(0).toUpperCase() + name.slice(1),
          });
        }
      }
    } catch { /* skip */ }
  }

  const resolvedPagesDir = join(process.cwd(), pagesDir);
  if (existsSync(resolvedPagesDir)) {
    walk(resolvedPagesDir, resolvedPagesDir);
  }
  return pages;
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Inject meta description, canonical URL, OG tags, and JSON-LD into each built HTML page's <head>.
 * Skips tags that already exist in the page.
 */
function injectHeadTags(pages: ScannedPage[], config: ResolvedAeoConfig): number {
  let injectedCount = 0;

  for (const page of pages) {
    let html: string;
    try {
      html = readFileSync(page.filePath, 'utf-8');
    } catch {
      continue;
    }

    const tags: string[] = [];

    // Meta description — only if page doesn't already have one
    if (!/name=["']description["']/i.test(html)) {
      const desc = page.description || config.description;
      if (desc) {
        tags.push(`<meta name="description" content="${escapeAttr(desc)}" />`);
      }
    }

    // Canonical URL — only if page doesn't already have one
    if (!/rel=["']canonical["']/i.test(html)) {
      const pageUrl = page.pathname === '/'
        ? config.url
        : `${config.url.replace(/\/$/, '')}${page.pathname}`;
      tags.push(`<link rel="canonical" href="${escapeAttr(pageUrl)}" />`);
    }

    // Open Graph + Twitter Card tags — only if no OG tags exist
    if (config.og.enabled && !/property=["']og:/i.test(html)) {
      const ogHtml = generateOGTagsHtml(page, config);
      if (ogHtml) tags.push(ogHtml);
    }

    // JSON-LD structured data — only if no JSON-LD exists
    if (config.schema.enabled && !/application\/ld\+json/i.test(html)) {
      const siteSchemas = generateSiteSchemas(config);
      const pageSchemas = generatePageSchemas(page, config);
      const jsonLdHtml = generateJsonLdScript([...siteSchemas, ...pageSchemas]);
      if (jsonLdHtml) tags.push(jsonLdHtml);
    }

    // Link alternate tags for AEO files — only if not already present
    if (!/rel=["']alternate["'][^>]*llms\.txt/i.test(html)) {
      const base = config.url ? new URL(config.url).pathname.replace(/\/$/, '') : '';
      tags.push(`<link rel="alternate" type="text/plain" href="${base}/llms.txt" title="LLM Summary" />`);
      tags.push(`<link rel="alternate" type="text/plain" href="${base}/llms-full.txt" title="Full Content for LLMs" />`);
      tags.push(`<link rel="alternate" type="application/json" href="${base}/docs.json" title="Documentation Manifest" />`);
      tags.push(`<link rel="alternate" type="application/json" href="${base}/ai-index.json" title="AI-Optimized Index" />`);
    }

    if (tags.length === 0) continue;

    // Inject before </head>
    const injection = '\n    ' + tags.join('\n    ') + '\n  ';
    const newHtml = html.replace('</head>', injection + '</head>');

    if (newHtml !== html) {
      writeFileSync(page.filePath, newHtml, 'utf-8');
      injectedCount++;
    }
  }

  return injectedCount;
}

export function aeoAstroIntegration(options: AeoConfig = {}): any {
  let resolvedConfig = resolveConfig(options);
  let astroConfig: any;

  return {
    name: 'aeo-astro',

    hooks: {
      'astro:config:setup': ({ config, command, injectScript }: any) => {
        astroConfig = config;

        resolvedConfig = resolveConfig({
          ...options,
          contentDir: options.contentDir || 'src/content',
          outDir: options.outDir || (command === 'build' ? config.outDir.pathname : config.publicDir.pathname),
        });

        if (command === 'dev') {
          const publicPath = config.publicDir.pathname;
          if (!existsSync(publicPath)) {
            mkdirSync(publicPath, { recursive: true });
          }
        }

        if (resolvedConfig.widget.enabled && injectScript) {
          const widgetConfig = JSON.stringify({
            title: resolvedConfig.title,
            description: resolvedConfig.description,
            url: resolvedConfig.url,
            widget: resolvedConfig.widget,
          });
          injectScript(
            'page',
            `import { AeoWidget } from 'aeo.js/widget';
let __aeoWidget;
function __initAeoWidget() {
  if (__aeoWidget) __aeoWidget.destroy();
  try {
    __aeoWidget = new AeoWidget({ config: ${widgetConfig} });
  } catch (e) {
    console.warn('[aeo.js] Widget initialization failed:', e);
  }
}
// astro:page-load fires on initial load AND after every View Transition navigation
document.addEventListener('astro:page-load', __initAeoWidget);
// Fallback for Astro sites without View Transitions
if (!document.querySelector('meta[name="astro-view-transitions-enabled"]')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __initAeoWidget);
  } else {
    __initAeoWidget();
  }
}`
          );
        }
      },

      'astro:build:done': async ({ dir, logger }: any) => {
        const buildLogger = logger.fork('aeo.js');
        buildLogger.info('Generating AEO files...');

        const outPath = dir instanceof URL ? dir.pathname : (dir || astroConfig.outDir.pathname);
        const siteUrl = options.url || astroConfig.site || 'https://example.com';

        const discoveredPages = scanBuiltPages(outPath, siteUrl);
        buildLogger.info(`Discovered ${discoveredPages.length} pages from build output`);

        resolvedConfig = resolveConfig({
          ...options,
          outDir: options.outDir || outPath,
          pages: [...(options.pages || []), ...discoveredPages],
        });

        try {
          const result = await generateAEOFiles(resolvedConfig);

          if (result.files.length > 0) {
            buildLogger.info(`Generated ${result.files.length} files`);
            result.files.forEach((file: string) => {
              buildLogger.debug(`  - ${file}`);
            });
          }

          if (result.errors.length > 0) {
            buildLogger.error('Errors during generation:');
            result.errors.forEach((error: string) => {
              buildLogger.error(`  - ${error}`);
            });
          }
        } catch (error) {
          buildLogger.error(`Failed to generate AEO files: ${error}`);
        }

        // Auto-inject meta tags, OG, canonical, and JSON-LD into built HTML pages
        try {
          const injected = injectHeadTags(discoveredPages, resolvedConfig);
          if (injected > 0) {
            buildLogger.info(`Injected head tags into ${injected} pages`);
          }
        } catch (error) {
          buildLogger.error(`Failed to inject head tags: ${error}`);
        }
      },

      'astro:server:setup': async ({ server, logger }: any) => {
        const devLogger = logger.fork('aeo.js');

        devLogger.info('Generating AEO files for development...');

        const devPages = scanDevPages('src/pages');
        resolvedConfig = resolveConfig({
          ...options,
          contentDir: options.contentDir || 'src/content',
          outDir: resolvedConfig.outDir,
          pages: [...(options.pages || []), ...devPages],
        });

        try {
          const result = await generateAEOFiles(resolvedConfig);

          if (result.files.length > 0) {
            devLogger.info(`Generated ${result.files.length} files`);
          }

          if (result.errors.length > 0) {
            devLogger.error('Errors during generation:', result.errors);
          }
        } catch (error) {
          devLogger.error(`Failed to generate AEO files: ${error}`);
        }

        // Dynamic middleware: serve .md files with full page content extracted at request time
        const mdHandler = async (req: any, res: any, next: any) => {
          if (!req.url?.endsWith('.md')) return next();
          if (req.headers['x-aeo-internal']) return next();

          const filename = req.url.startsWith('/') ? req.url.slice(1) : req.url;

          // Handwritten .md files in contentDir take priority
          if (resolvedConfig.contentDir) {
            const contentFile = join(process.cwd(), resolvedConfig.contentDir, filename);
            if (existsSync(contentFile)) {
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
              res.end(readFileSync(contentFile, 'utf-8'));
              return;
            }
          }

          // Dynamic extraction: fetch the HTML page from the dev server and convert to markdown
          let pagePath = req.url.replace(/\.md$/, '') || '/';
          if (pagePath === '/index') pagePath = '/';
          try {
            const rawHost = req.headers.host || 'localhost:4321';
            // Only allow localhost/127.0.0.1 to prevent SSRF via forged Host headers
            const host = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(rawHost) ? rawHost : 'localhost:4321';
            const protocol = 'http';
            const response = await fetch(`${protocol}://${host}${pagePath}`, {
              headers: { 'x-aeo-internal': '1' },
            });
            if (response.ok) {
              const html = await response.text();
              const md = htmlToMarkdown(html, pagePath, resolvedConfig);
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
              res.end(md);
              return;
            }
          } catch { /* fall through to static file */ }

          // Fallback to pre-generated static .md file
          const filepath = join(resolvedConfig.outDir, filename);
          if (existsSync(filepath)) {
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.end(readFileSync(filepath, 'utf-8'));
            return;
          }

          next();
        };
        server.middlewares.stack.unshift({ route: '', handle: mdHandler });

        if (resolvedConfig.contentDir) {
          const contentPath = join(process.cwd(), resolvedConfig.contentDir);

          server.watcher.add(join(contentPath, '**/*.md'));
          server.watcher.add(join(contentPath, '**/*.mdx'));

          server.watcher.on('change', async (file: string) => {
            if (file.endsWith('.md') || file.endsWith('.mdx')) {
              devLogger.info('Content file changed, regenerating AEO files...');

              try {
                const result = await generateAEOFiles(resolvedConfig);

                if (result.files.length > 0) {
                  devLogger.info(`Regenerated ${result.files.length} files`);
                }

                if (result.errors.length > 0) {
                  devLogger.error('Errors during regeneration:', result.errors);
                }
              } catch (error) {
                devLogger.error(`Failed to regenerate AEO files: ${error}`);
              }
            }
          });
        }
      },
    },
  };
}

export const AeoMetaTags = ({ config, page }: { config?: AeoConfig; page?: { pathname?: string; title?: string; description?: string; content?: string } }) => {
  const resolvedConfig = resolveConfig(config);
  const currentPage = page || { pathname: '/' };

  const pageEntry: PageEntry = {
    pathname: currentPage.pathname || '/',
    title: currentPage.title,
    description: currentPage.description,
    content: currentPage.content,
  };

  // JSON-LD structured data
  let jsonLd = '';
  if (resolvedConfig.schema.enabled) {
    const schemas = generatePageSchemas(pageEntry, resolvedConfig);
    jsonLd = generateJsonLdScript(schemas);
  }

  // OG / Twitter Card meta tags
  let ogTags = '';
  if (resolvedConfig.og.enabled) {
    ogTags = generateOGTagsHtml(pageEntry, resolvedConfig);
  }

  return `
    <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM Summary" />
    <link rel="alternate" type="text/plain" href="/llms-full.txt" title="Full Content for LLMs" />
    <link rel="alternate" type="application/json" href="/docs.json" title="Documentation Manifest" />
    <link rel="alternate" type="application/json" href="/ai-index.json" title="AI-Optimized Index" />
    <meta name="aeo:title" content="${resolvedConfig.title}" />
    <meta name="aeo:description" content="${resolvedConfig.description}" />
    <meta name="aeo:url" content="${resolvedConfig.url}" />
    ${ogTags}
    ${jsonLd}
  `;
};

export function defineAeoConfig(config: AeoConfig): AeoConfig {
  return config;
}

export default aeoAstroIntegration;
