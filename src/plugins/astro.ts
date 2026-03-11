import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';

function scanBuiltPages(dir: string, baseUrl: string): PageEntry[] {
  const pages: PageEntry[] = [];

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
            const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
            const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
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

            const rawTitle = titleMatch ? titleMatch[1] : undefined;
            const title = rawTitle?.split('|')[0]?.trim() || rawTitle;

            pages.push({
              pathname,
              title,
              description: descMatch ? descMatch[1] : undefined,
              content: textContent,
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

function extractTextFromHtml(html: string): string {
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
  const textContent = extractTextFromHtml(html);

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
            const host = req.headers.host || 'localhost:4321';
            const protocol = req.connection?.encrypted ? 'https' : 'http';
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

export const AeoMetaTags = ({ config }: { config?: AeoConfig }) => {
  const resolvedConfig = resolveConfig(config);

  return `
    <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM Summary" />
    <link rel="alternate" type="text/plain" href="/llms-full.txt" title="Full Content for LLMs" />
    <link rel="alternate" type="application/json" href="/docs.json" title="Documentation Manifest" />
    <link rel="alternate" type="application/json" href="/ai-index.json" title="AI-Optimized Index" />
    <meta name="aeo:title" content="${resolvedConfig.title}" />
    <meta name="aeo:description" content="${resolvedConfig.description}" />
    <meta name="aeo:url" content="${resolvedConfig.url}" />
  `;
};

export function defineAeoConfig(config: AeoConfig): AeoConfig {
  return config;
}

export default aeoAstroIntegration;
