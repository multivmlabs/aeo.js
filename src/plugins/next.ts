import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { extractTextFromHtml, extractTitle, extractDescription } from '../core/html-extract';
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
      if (stat.isDirectory() && !entry.startsWith('.') && !entry.startsWith('_') && entry !== 'api') {
        // Enter route groups (parenthesized dirs) but also regular dirs and dynamic segments
        scanAppRouter(fullPath, base, pages);
      } else if (entry.match(/^page\.(tsx?|jsx?|mdx?)$/)) {
        // Build pathname: strip route group segments like (marketing)
        const relative = dir.slice(base.length);
        const pathname = relative
          .split('/')
          .filter(seg => seg && !seg.startsWith('('))
          .join('/');
        const cleanPathname = '/' + pathname;
        const name = cleanPathname.split('/').filter(Boolean).pop();
        pages.push({
          pathname: cleanPathname === '/' ? '/' : cleanPathname,
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
        const discoveredPages = scanNextPages(projectRoot)
          // Filter out dynamic route segments — they're templates, not real URLs
          .filter(p => !p.pathname.includes('['));

        // Default root page title/description to config values
        for (const page of discoveredPages) {
          if (page.pathname === '/' && !page.title) {
            page.title = aeoOptions.title;
          }
          if (!page.description && aeoOptions.description) {
            page.description = aeoOptions.description;
          }
        }

        // Resolve contentDir: prefer user-specified, then known content dirs, then src/
        // Never fall back to project root — it causes recursive crawling of public/, .next/, etc.
        const contentDir = aeoOptions.contentDir
          || [join(projectRoot, 'content'), join(projectRoot, 'docs'), join(projectRoot, 'src')].find(d => existsSync(d))
          || join(projectRoot, 'content');

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

  const metadata: Record<string, any> = {
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

  // OG / Twitter Card metadata
  if (resolvedConfig.og.enabled) {
    metadata.openGraph = {
      type: resolvedConfig.og.type,
      title: resolvedConfig.title,
      description: resolvedConfig.description,
      url: resolvedConfig.url,
      siteName: resolvedConfig.title,
      ...(resolvedConfig.og.image ? { images: [{ url: resolvedConfig.og.image }] } : {}),
    };
    metadata.twitter = {
      card: resolvedConfig.og.image ? 'summary_large_image' : 'summary',
      title: resolvedConfig.title,
      description: resolvedConfig.description,
      ...(resolvedConfig.og.twitterHandle ? { site: resolvedConfig.og.twitterHandle } : {}),
      ...(resolvedConfig.og.image ? { images: [resolvedConfig.og.image] } : {}),
    };
  }

  return metadata;
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
          const title = extractTitle(html);
          const description = extractDescription(html);
          const textContent = extractTextFromHtml(html);
          const pathname = basePath || '/';
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

  // Discover pages from both source files AND build output
  const sourcePages = scanNextPages(projectRoot);
  const buildPages = scanNextBuildOutput(projectRoot);

  if (sourcePages.length > 0) {
    console.log(`[aeo.js] Discovered ${sourcePages.length} routes from source files`);
  }
  if (buildPages.length > 0) {
    console.log(`[aeo.js] Discovered ${buildPages.length} pages from Next.js build output`);
  }

  // Merge: build output pages have richer content (title, description, content),
  // so prefer them when available, but keep source-only routes too
  const buildMap = new Map(buildPages.map(p => [p.pathname, p]));
  const mergedPages: PageEntry[] = [];
  const seen = new Set<string>();

  // Add all build output pages first (they have content)
  for (const page of buildPages) {
    // Skip dynamic route patterns from build output
    if (page.pathname.includes('[') || page.pathname.includes('%5B')) continue;
    mergedPages.push(page);
    seen.add(page.pathname);
  }

  // Add source-discovered routes not in build output (SSR/dynamic pages)
  for (const page of sourcePages) {
    // Skip dynamic route segments — they're templates, not real URLs
    if (page.pathname.includes('[')) continue;
    if (seen.has(page.pathname)) continue;
    mergedPages.push(page);
    seen.add(page.pathname);
  }

  // Default root page title/description from config
  for (const page of mergedPages) {
    if (page.pathname === '/' && !page.title && config.title) {
      page.title = config.title;
    }
    if (!page.description && config.description) {
      page.description = config.description;
    }
  }

  const contentDir = config.contentDir
    || [join(projectRoot, 'content'), join(projectRoot, 'docs'), join(projectRoot, 'src')].find(d => existsSync(d))
    || join(projectRoot, 'content');

  const resolvedConfig = resolveConfig({
    ...config,
    outDir: config.outDir || join(projectRoot, 'public'),
    contentDir,
    pages: [...(config.pages || []), ...mergedPages],
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
