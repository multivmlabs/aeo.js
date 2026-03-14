import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import { extractTextFromHtml, extractTitle, extractDescription, htmlToMarkdown } from '../core/html-extract';
import { generatePageSchemas, generateSiteSchemas, generateJsonLdScript } from '../core/schema';
import { generateOGTagsHtml } from '../core/opengraph';
import type { AeoConfig, PageEntry } from '../types';
import { join, dirname } from 'path';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

function scanBuiltHtml(dir: string): PageEntry[] {
  const pages: PageEntry[] = [];
  function walk(currentDir: string): void {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'assets') {
          walk(fullPath);
        } else if (entry.endsWith('.html') && entry !== '404.html' && entry !== '500.html') {
          try {
            const html = readFileSync(fullPath, 'utf-8');
            const title = extractTitle(html);
            const description = extractDescription(html);
            const textContent = extractTextFromHtml(html);
            const normalizedDir = dir.endsWith('/') ? dir : dir + '/';
            const relative = fullPath.slice(normalizedDir.length);
            let pathname = '/' + relative.replace(/\/?index\.html$/, '').replace(/\.html$/, '');
            pathname = pathname.replace(/\/+/g, '/') || '/';
            pages.push({ pathname, title, description, content: textContent });
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }
  walk(dir);
  return pages;
}

export function aeoVitePlugin(options: AeoConfig = {}): any {
  let resolvedConfig = resolveConfig(options);
  let buildOutDir = '';
  let viteRoot = '';

  return {
    name: 'vite-plugin-aeo',
    enforce: 'pre' as const,

    config() {
      // Resolve widget module path relative to this plugin file.
      // In the built package, widget.mjs is a sibling of vite.mjs in dist/.
      const pluginDir = typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url));
      const widgetMjs = join(pluginDir, 'widget.mjs');
      const widgetJs = join(pluginDir, 'widget.js');
      const widgetEntry = existsSync(widgetMjs) ? widgetMjs : widgetJs;

      return {
        resolve: {
          alias: resolvedConfig.widget.enabled
            ? [{ find: 'aeo.js/widget', replacement: widgetEntry }]
            : [],
        },
      };
    },

    configResolved(config: any) {
      viteRoot = config.root;
      buildOutDir = config.build.outDir;

      if (config.command !== 'build') {
        resolvedConfig = resolveConfig({
          ...options,
          outDir: options.outDir || join(config.root, 'public'),
        });
      }
    },

    configureServer(server: any) {
      console.log('[aeo.js] Generating AEO files for development...');

      generateAEOFiles(resolvedConfig).then(result => {
        if (result.files.length > 0) console.log(`[aeo.js] Generated ${result.files.length} files`);
        if (result.errors.length > 0) console.error('[aeo.js] Errors:', result.errors);
      }).catch(err => console.error('[aeo.js] Failed:', err));

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
          const rawHost = req.headers.host || 'localhost:5173';
          // Only allow localhost/127.0.0.1 to prevent SSRF via forged Host headers
          const host = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(rawHost) ? rawHost : 'localhost:5173';
          const protocol = 'http';
          const response = await fetch(`${protocol}://${host}${pagePath}`, {
            headers: { 'x-aeo-internal': '1' },
          });
          if (response.ok) {
            const html = await response.text();
            const textContent = extractTextFromHtml(html);

            // SPA detection: if the HTML has no meaningful text content
            // (just a shell like <div id="app"></div>), return 404 so the
            // widget falls back to client-side DOM extraction.
            if (!textContent || textContent.trim().length < 50) {
              next();
              return;
            }

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
        server.watcher.add(join(process.cwd(), resolvedConfig.contentDir, '**/*.md'));
        server.watcher.on('change', async (file: string) => {
          if (file.endsWith('.md')) {
            console.log('[aeo.js] Markdown file changed, regenerating...');
            try {
              const result = await generateAEOFiles(resolvedConfig);
              if (result.files.length > 0) console.log(`[aeo.js] Regenerated ${result.files.length} files`);
              if (result.errors.length > 0) console.error('[aeo.js] Errors:', result.errors);
            } catch (error) { console.error('[aeo.js] Failed:', error); }
          }
        });
      }
    },

    // Generate AFTER build completes so files don't get wiped by Vite's clean
    async closeBundle() {
      const outDir = join(viteRoot, buildOutDir);
      if (!existsSync(outDir)) return;

      console.log('[aeo.js] Generating AEO files...');

      const discoveredPages = scanBuiltHtml(outDir);
      if (discoveredPages.length > 0) {
        console.log(`[aeo.js] Discovered ${discoveredPages.length} pages from build output`);
      }

      // Default page title/description from config when not found in HTML
      for (const page of discoveredPages) {
        if (page.pathname === '/' && !page.title && options.title) {
          page.title = options.title;
        }
        if (!page.description && options.description) {
          page.description = options.description;
        }
      }

      resolvedConfig = resolveConfig({
        ...options,
        outDir: options.outDir || outDir,
        pages: [...(options.pages || []), ...discoveredPages],
      });

      try {
        const result = await generateAEOFiles(resolvedConfig);
        if (result.files.length > 0) console.log(`[aeo.js] Generated ${result.files.length} files`);
        if (result.errors.length > 0) console.error('[aeo.js] Errors:', result.errors);
      } catch (error) {
        console.error('[aeo.js] Failed to generate AEO files:', error);
      }
    },

    resolveId(id: string) {
      if (id === 'virtual:aeo-widget') return '\0virtual:aeo-widget';
    },

    load(id: string) {
      if (id === '\0virtual:aeo-widget') {
        const widgetConfig = {
          title: resolvedConfig.title,
          description: resolvedConfig.description,
          url: resolvedConfig.url,
          widget: resolvedConfig.widget,
        };
        return `
import { AeoWidget } from 'aeo.js/widget';
if (typeof window !== 'undefined') {
  const init = () => {
    try {
      new AeoWidget({ config: ${JSON.stringify(widgetConfig)} });
    } catch (e) {
      console.warn('[aeo.js] Widget initialization failed:', e);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}`;
      }
    },

    transformIndexHtml: {
      order: 'pre' as const,
      handler(html: string, ctx: any) {
        let result = html;

        // Determine current page from the request path
        let pagePath = '/';
        if (ctx?.path) {
          pagePath = ctx.path.replace(/\/index\.html$/, '/').replace(/\.html$/, '') || '/';
        }
        const pageEntry: PageEntry = {
          pathname: pagePath,
          title: extractTitle(html),
          description: extractDescription(html),
          content: extractTextFromHtml(html),
        };

        // Inject canonical URL if not present
        if (!/rel=["']canonical["']/i.test(result)) {
          const canonicalUrl = pagePath === '/'
            ? resolvedConfig.url
            : `${resolvedConfig.url.replace(/\/$/, '')}${pagePath}`;
          result = result.replace('</head>', `    <link rel="canonical" href="${canonicalUrl}" />\n</head>`);
        }

        // Inject meta description if not present
        if (!/name=["']description["']/i.test(result)) {
          const desc = pageEntry.description || resolvedConfig.description;
          if (desc) {
            const escDesc = desc.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            result = result.replace('</head>', `    <meta name="description" content="${escDesc}" />\n</head>`);
          }
        }

        // Inject OG meta tags
        if (resolvedConfig.og.enabled) {
          const ogHtml = generateOGTagsHtml(pageEntry, resolvedConfig);
          result = result.replace('</head>', `    ${ogHtml}\n</head>`);
        }

        // Inject JSON-LD structured data
        if (resolvedConfig.schema.enabled) {
          const siteSchemas = generateSiteSchemas(resolvedConfig);
          const pageSchemas = generatePageSchemas(pageEntry, resolvedConfig);
          const jsonLd = generateJsonLdScript([...siteSchemas, ...pageSchemas]);
          if (jsonLd) {
            result = result.replace('</head>', `    ${jsonLd}\n</head>`);
          }
        }

        // Inject widget script
        if (resolvedConfig.widget.enabled) {
          result = result.replace('</body>', `<script type="module" src="virtual:aeo-widget"></script>\n</body>`);
        }

        return result;
      },
    },
  };
}

export default aeoVitePlugin;
