import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';

export interface NextAeoConfig {
  aeo?: AeoConfig;
  webpack?: (config: any, options: any) => any;
  rewrites?: any;
  [key: string]: any;
}

function scanNextPages(projectRoot: string): PageEntry[] {
  const pages: PageEntry[] = [];

  // Scan app/ directory (App Router)
  for (const base of ['app', 'src/app']) {
    const dir = join(projectRoot, base);
    if (existsSync(dir)) scanAppRouter(dir, dir, pages);
  }

  // Scan pages/ directory (Pages Router)
  for (const base of ['pages', 'src/pages']) {
    const dir = join(projectRoot, base);
    if (existsSync(dir)) scanPagesRouter(dir, dir, pages);
  }

  return pages;
}

function scanAppRouter(dir: string, base: string, pages: PageEntry[]): void {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !entry.startsWith('.') && !entry.startsWith('_') && !entry.startsWith('(') && entry !== 'api') {
        scanAppRouter(fullPath, base, pages);
      } else if (entry.match(/^page\.(tsx?|jsx?|mdx?)$/)) {
        const relative = dir.slice(base.length);
        const pathname = relative || '/';
        const name = pathname.split('/').filter(Boolean).pop();
        pages.push({
          pathname,
          title: name ? name.charAt(0).toUpperCase() + name.slice(1) : undefined,
        });
      }
    }
  } catch { /* skip */ }
}

function scanPagesRouter(dir: string, base: string, pages: PageEntry[]): void {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !entry.startsWith('.') && !entry.startsWith('_') && entry !== 'api') {
        scanPagesRouter(fullPath, base, pages);
      } else if (entry.match(/\.(tsx?|jsx?|mdx?)$/) && !entry.startsWith('_') && !entry.startsWith('[')) {
        const relative = fullPath.slice(base.length);
        let pathname = relative.replace(/\.(tsx?|jsx?|mdx?)$/, '');
        if (pathname.endsWith('/index')) pathname = pathname.slice(0, -6) || '/';
        pathname = pathname.replace(/\/+/g, '/') || '/';
        const name = entry.replace(/\.(tsx?|jsx?|mdx?)$/, '');
        pages.push({
          pathname,
          title: name === 'index' ? undefined : name.charAt(0).toUpperCase() + name.slice(1),
        });
      }
    }
  } catch { /* skip */ }
}

export function withAeo(nextConfig: NextAeoConfig = {}): Record<string, any> {
  const { aeo: aeoOptions = {}, ...restConfig } = nextConfig;

  return {
    ...restConfig,

    webpack(config: any, options: any) {
      if (typeof nextConfig.webpack === 'function') {
        config = nextConfig.webpack(config, options);
      }

      if (!options.isServer && !options.dev) {
        const projectRoot = process.cwd();
        const discoveredPages = scanNextPages(projectRoot);

        // Default root page title/description to config values
        for (const page of discoveredPages) {
          if (page.pathname === '/' && !page.title) {
            page.title = aeoOptions.title;
          }
          if (!page.description && aeoOptions.description) {
            page.description = aeoOptions.description;
          }
        }

        // Resolve contentDir: prefer user-specified, then src/, then project root
        const contentDir = aeoOptions.contentDir
          || (existsSync(join(projectRoot, 'src')) ? join(projectRoot, 'src') : projectRoot);

        const resolvedConfig = resolveConfig({
          ...aeoOptions,
          outDir: aeoOptions.outDir || join(projectRoot, 'public'),
          contentDir,
          pages: [...(aeoOptions.pages || []), ...discoveredPages],
        });

        if (!existsSync(resolvedConfig.outDir)) {
          mkdirSync(resolvedConfig.outDir, { recursive: true });
        }

        config.plugins.push({
          apply: (compiler: any) => {
            compiler.hooks.afterEmit.tapAsync('AeoPlugin', async (_compilation: any, callback: any) => {
              console.log('[aeo.js] Generating AEO files for Next.js...');

              try {
                const result = await generateAEOFiles(resolvedConfig);
                if (result.files.length > 0) {
                  console.log(`[aeo.js] Generated ${result.files.length} files`);
                }
                if (result.errors.length > 0) {
                  console.error('[aeo.js] Errors:', result.errors);
                }
              } catch (error) {
                console.error('[aeo.js] Failed to generate AEO files:', error);
              }

              callback();
            });
          }
        });
      }

      return config;
    },
  };
}

export async function generateAeoMetadata(config?: AeoConfig) {
  const resolvedConfig = resolveConfig(config);

  if (process.env.NODE_ENV === 'production') {
    await generateAEOFiles(resolvedConfig);
  }

  return {
    title: resolvedConfig.title,
    description: resolvedConfig.description,
    alternates: {
      types: {
        'text/plain': [
          { url: '/llms.txt', title: 'LLM Summary' },
          { url: '/llms-full.txt', title: 'Full Content for LLMs' },
        ],
        'application/json': [
          { url: '/docs.json', title: 'Documentation Manifest' },
          { url: '/ai-index.json', title: 'AI-Optimized Index' },
        ],
      },
    },
  };
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

function scanNextBuildOutput(projectRoot: string): PageEntry[] {
  const pages: PageEntry[] = [];
  const serverAppDir = join(projectRoot, '.next', 'server', 'app');

  if (!existsSync(serverAppDir)) return pages;

  function walk(dir: string, basePath: string = ''): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('_') && !entry.startsWith('.')) {
          walk(fullPath, `${basePath}/${entry}`);
        } else if (entry === 'index.html') {
          const html = readFileSync(fullPath, 'utf-8');
          const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
          const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
          const textContent = extractText(html);
          const pathname = basePath || '/';
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

  walk(serverAppDir);
  return pages;
}

/**
 * Post-build function that reads pre-rendered HTML from .next/server/
 * and regenerates AEO files with actual page content.
 * Use in package.json: "postbuild": "node -e \"import('aeo.js/next').then(m => m.postBuild({...}))\""
 */
export async function postBuild(config: AeoConfig = {}): Promise<void> {
  const projectRoot = process.cwd();
  const discoveredPages = scanNextBuildOutput(projectRoot);

  if (discoveredPages.length > 0) {
    console.log(`[aeo.js] Discovered ${discoveredPages.length} pages from Next.js build output`);
  }

  // Default root page title/description from config
  for (const page of discoveredPages) {
    if (page.pathname === '/' && !page.title && config.title) {
      page.title = config.title;
    }
    if (!page.description && config.description) {
      page.description = config.description;
    }
  }

  const contentDir = config.contentDir
    || (existsSync(join(projectRoot, 'src')) ? join(projectRoot, 'src') : projectRoot);

  const resolvedConfig = resolveConfig({
    ...config,
    outDir: config.outDir || join(projectRoot, 'public'),
    contentDir,
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

export default withAeo;
