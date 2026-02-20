import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
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
            const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
            const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
            const textContent = extractText(html);
            const normalizedDir = dir.endsWith('/') ? dir : dir + '/';
            const relative = fullPath.slice(normalizedDir.length);
            let pathname = '/' + relative.replace(/\/?index\.html$/, '').replace(/\.html$/, '');
            pathname = pathname.replace(/\/+/g, '/') || '/';
            const rawTitle = titleMatch ? titleMatch[1] : undefined;
            pages.push({ pathname, title: rawTitle?.split('|')[0]?.trim() || rawTitle, description: descMatch?.[1], content: textContent });
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }
  walk(dir);
  return pages;
}

function extractText(html: string): string {
  let text = html;
  // Remove scripts, styles, SVGs
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  // Extract from <main> if available, otherwise strip boilerplate
  const mainMatch = text.match(/<main[^>]*>([\s\S]*)<\/main>/i);
  if (mainMatch) {
    text = mainMatch[1];
  } else {
    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  }
  // Handle links wrapping block elements: flatten to inline link
  text = text.replace(/<a[^>]+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, url, inner) => {
    if (/<(?:h[1-6]|div|p|section)[^>]*>/i.test(inner)) {
      const cleanInner = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `\n[${cleanInner.slice(0, 120).trim()}](${url})\n`;
    }
    return `[${inner}](${url})`;
  });
  // Convert headings (h1 -> ## since # is the page title)
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n');
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');
  // Convert remaining inline links
  text = text.replace(/<a[^>]+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  // Convert bold and italic
  text = text.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  text = text.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');
  // Convert list items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  // Convert blockquotes
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n\n> $1\n\n');
  // Convert hr and br
  text = text.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');
  text = text.replace(/<br[^>]*\/?>/gi, '\n');
  // Convert paragraphs
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  // Other block elements as newlines
  text = text.replace(/<\/?(?:div|section|article|header|main|aside|figure|figcaption|table|thead|tbody|tr|td|th|ul|ol|dl|dt|dd)[^>]*>/gi, '\n');
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&copy;/g, '(c)');
  // Strip emojis (including flags)
  text = text.replace(/[\u{1F1E0}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '');
  // Clean up lines
  text = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  // Clean whitespace inside markdown syntax
  text = text.replace(/\[[\s\n]+/g, '[').replace(/[\s\n]+\]/g, ']');
  text = text.replace(/(#{2,6})\s*\n+\s*/g, '$1 ');
  // Remove empty headings
  text = text.replace(/^#{2,6}\s*$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim().slice(0, 8000);
}

function htmlToMarkdown(html: string, pagePath: string, config: any): string {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const textContent = extractText(html);

  const rawTitle = titleMatch ? titleMatch[1]?.split('|')[0]?.trim() : undefined;
  const description = descMatch?.[1];
  const pageUrl = pagePath === '/'
    ? config.url
    : `${config.url.replace(/\/$/, '')}${pagePath}`;

  const lines: string[] = [];

  // YAML frontmatter
  lines.push('---');
  if (rawTitle) lines.push(`title: "${rawTitle}"`);
  if (description) lines.push(`description: "${description}"`);
  lines.push(`url: ${pageUrl}`);
  lines.push(`source: ${pageUrl}`);
  lines.push(`generated_by: aeo.js`);
  lines.push('---', '');

  if (rawTitle) lines.push(`# ${rawTitle}`, '');
  if (description) lines.push(`${description}`, '');

  if (textContent) lines.push(textContent);

  return lines.join('\n');
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
          const host = req.headers.host || 'localhost:5173';
          const protocol = req.connection?.encrypted ? 'https' : 'http';
          const response = await fetch(`${protocol}://${host}${pagePath}`, {
            headers: { 'x-aeo-internal': '1' },
          });
          if (response.ok) {
            const html = await response.text();
            const textContent = extractText(html);

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
      handler(html: string) {
        if (!resolvedConfig.widget.enabled) return html;
        return html.replace('</body>', `<script type="module" src="virtual:aeo-widget"></script>\n</body>`);
      },
    },
  };
}

export default aeoVitePlugin;
