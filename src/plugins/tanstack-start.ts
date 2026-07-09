import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { extractTextFromHtml, extractTitle, extractDescription } from '../core/html-extract';
import { join, relative, sep } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';

const ROUTE_EXTENSIONS = /\.(tsx|jsx|ts|js|mdx?)$/;

/**
 * Convert a TanStack Router file-based route id to a pathname.
 *
 * The route id is the file's path relative to the routes directory, without
 * its extension. Both the directory separator (`/`) and the flat-route
 * separator (`.`) denote nesting, so they're treated the same.
 *
 * Returns null for routes that can't be enumerated statically (dynamic `$`
 * segments, splats) or that aren't pages (`__root`, `-` excluded files).
 *
 *   index                 → /
 *   about                 → /about
 *   posts.index           → /posts
 *   posts/index           → /posts
 *   posts.$postId         → null (dynamic)
 *   posts/route           → /posts (layout route token)
 *   _pathless.dashboard   → /dashboard (pathless layout segment omitted)
 *   posts_.$id.edit       → null (un-nested, but still dynamic)
 *   __root                → null (root layout, not a page)
 *   -ignored              → null (excluded file)
 *
 * @see https://tanstack.com/router/latest/docs/routing/file-naming-conventions
 */
export function tanstackRouteToPathname(routeId: string): string | null {
  // Both '/' (directory) and '.' (flat) are nesting separators in TanStack Router.
  const rawParts = routeId.split(/[./]/);
  const segments: string[] = [];

  for (let i = 0; i < rawParts.length; i++) {
    const rawSegment = rawParts[i];
    if (rawSegment === '') continue;
    // The root route is a layout wrapper, never a page.
    if (rawSegment === '__root') return null;
    // '-' prefix excludes a file/folder from route generation entirely.
    if (rawSegment.startsWith('-')) return null;
    // Trailing underscore un-nests from the parent layout but keeps the path.
    const segment = rawSegment.endsWith('_') ? rawSegment.slice(0, -1) : rawSegment;
    // Index tokens collapse into their parent path.
    if (segment === 'index' || segment === '_index') continue;
    // 'route' is a layout-route token only as the last part of a nested id
    // (e.g. posts/route.tsx → /posts). A standalone route.tsx → /route.
    if (segment === 'route' && i === rawParts.length - 1 && i > 0) continue;
    // Pathless layout route (prefix '_') contributes no URL segment.
    if (segment.startsWith('_')) continue;
    // Dynamic params ($postId) and splats ($) can't be enumerated statically.
    if (segment.includes('$')) return null;
    // [escaped] segments map to their literal content.
    segments.push(segment.replace(/^\[(.*)\]$/, '$1'));
  }

  return '/' + segments.join('/');
}

/**
 * Recursively scan a TanStack Router routes directory for static pages.
 * Files/directories prefixed with '-' or '.' and the generated route tree
 * are skipped.
 */
function scanRouteFiles(baseDir: string): PageEntry[] {
  const pages: PageEntry[] = [];
  const seen = new Set<string>();

  function walk(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith('.') || entry.startsWith('-')) continue;
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!stat.isFile() || !ROUTE_EXTENSIONS.test(entry)) continue;
      // Skip the auto-generated route tree, not an actual route.
      if (/^routeTree\.gen\./.test(entry)) continue;

      const routeId = relative(baseDir, fullPath).replace(ROUTE_EXTENSIONS, '').split(sep).join('/');
      const pathname = tanstackRouteToPathname(routeId);
      if (pathname === null || seen.has(pathname)) continue;
      seen.add(pathname);

      const segment = pathname.split('/').filter(Boolean).pop();
      pages.push({
        pathname,
        title: segment ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ') : undefined,
      });
    }
  }

  walk(baseDir);
  return pages;
}

/**
 * Locate the TanStack Router routes directory. Defaults to src/routes, which
 * is the convention for TanStack Start; falls back to app/routes.
 */
function detectRoutesDir(projectRoot: string): string | null {
  for (const candidate of [join(projectRoot, 'src', 'routes'), join(projectRoot, 'app', 'routes')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Discover pages from TanStack Router source routes. */
function scanTanStackRoutes(projectRoot: string): PageEntry[] {
  const routesDir = detectRoutesDir(projectRoot);
  if (!routesDir) return [{ pathname: '/' }];

  const pages = scanRouteFiles(routesDir);
  if (!pages.some((p) => p.pathname === '/')) {
    pages.unshift({ pathname: '/' });
  }
  return pages;
}

/**
 * Detect a TanStack Start build output directory containing prerendered HTML.
 * Nitro (the default server preset) writes static assets to .output/public;
 * Vite client builds land in dist. Best-effort — pass config.outDir to override.
 */
function detectOutputDir(projectRoot: string): string | null {
  for (const candidate of [
    join(projectRoot, '.output', 'public'),
    join(projectRoot, 'dist', 'client'),
    join(projectRoot, 'dist'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Scan a directory tree for prerendered HTML pages. */
function scanHtmlOutput(outputDir: string): PageEntry[] {
  const pages: PageEntry[] = [];
  if (!existsSync(outputDir)) return pages;

  function walk(dir: string, basePath: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'assets' && entry !== '_build') {
        walk(fullPath, `${basePath}/${entry}`);
      } else if (entry.endsWith('.html') && entry !== '404.html' && entry !== '500.html') {
        try {
          const html = readFileSync(fullPath, 'utf-8');
          const pathname = entry === 'index.html' ? basePath || '/' : `${basePath}/${entry.replace('.html', '')}`;
          pages.push({
            pathname,
            title: extractTitle(html),
            description: extractDescription(html),
            content: extractTextFromHtml(html),
          });
        } catch {
          /* skip */
        }
      }
    }
  }

  walk(outputDir, '');
  return pages;
}

/**
 * Generate a widget script tag for TanStack Start.
 * Returns a complete `<script type="module">…</script>` string. Render it in
 * your root route's document (e.g. inside `<body>` in __root.tsx) so the
 * widget loads on every page.
 */
export function getWidgetScript(config: AeoConfig = {}): string {
  const resolvedConfig = resolveConfig(config);
  if (!resolvedConfig.widget.enabled) return '';

  const widgetConfig = JSON.stringify({
    title: resolvedConfig.title,
    description: resolvedConfig.description,
    url: resolvedConfig.url,
    widget: resolvedConfig.widget,
  })
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  return `<script type="module">
import('aeo.js/widget').then(({ AeoWidget }) => {
  try {
    new AeoWidget({ config: ${widgetConfig} });
  } catch (e) {
    console.warn('[aeo.js] Widget initialization failed:', e);
  }
}).catch(() => {});
</script>`;
}

/** Merge auto-discovered pages with user overrides, applying config defaults. */
function mergePages(autoPages: PageEntry[], config: AeoConfig): PageEntry[] {
  const pageMap = new Map<string, PageEntry>();
  for (const page of autoPages) {
    const existing = pageMap.get(page.pathname);
    // Prerendered pages (with content) take priority over bare source routes.
    if (!existing || (page.content && !existing.content)) {
      pageMap.set(page.pathname, page);
    }
  }
  // config.pages entries unconditionally overwrite auto-scanned entries.
  for (const page of config.pages || []) {
    pageMap.set(page.pathname, page);
  }
  for (const page of pageMap.values()) {
    if (page.pathname === '/' && !page.title && config.title) {
      page.title = config.title;
    }
    if (!page.description && config.description) {
      page.description = config.description;
    }
  }
  return Array.from(pageMap.values());
}

/**
 * Post-build function for TanStack Start projects. Scans the build output for
 * prerendered HTML (richer, with content) plus the source routes, then writes
 * AEO files alongside the static assets so they're served from the site root.
 *
 * Usage in package.json:
 *   "postbuild": "node -e \"import('aeo.js/tanstack-start').then(m => m.postBuild({ title: 'My Site', url: 'https://mysite.com' }))\""
 */
export async function postBuild(config: AeoConfig = {}): Promise<void> {
  const projectRoot = process.cwd();
  const outputDir = config.outDir || detectOutputDir(projectRoot);

  if (!outputDir) {
    console.warn('[aeo.js] Could not locate a TanStack Start build output directory. Pass { outDir } or run generate() instead.');
    return;
  }

  console.log(`[aeo.js] Scanning TanStack Start build output: ${outputDir}`);

  const buildPages = scanHtmlOutput(outputDir);
  if (buildPages.length > 0) {
    console.log(`[aeo.js] Discovered ${buildPages.length} prerendered pages`);
  }

  const sourcePages = scanTanStackRoutes(projectRoot);
  const pages = mergePages([...buildPages, ...sourcePages], config);

  const resolvedConfig = resolveConfig({ ...config, outDir: outputDir, pages });
  const result = await generateAEOFiles(resolvedConfig);
  if (result.files.length > 0) {
    console.log(`[aeo.js] Generated ${result.files.length} files`);
  }
  if (result.errors.length > 0) {
    console.error('[aeo.js] Errors:', result.errors);
  }
}

/**
 * Generate AEO files for TanStack Start from source routes only (no build
 * output). Writes into public/ so the dev server and build ship them at the
 * site root.
 *
 * Usage in package.json:
 *   "aeo": "node -e \"import('aeo.js/tanstack-start').then(m => m.generate({ title: 'My Site', url: 'https://mysite.com' }))\""
 */
export async function generate(config: AeoConfig = {}): Promise<void> {
  const projectRoot = process.cwd();
  const discoveredPages = scanTanStackRoutes(projectRoot);

  if (discoveredPages.length > 0) {
    console.log(`[aeo.js] Discovered ${discoveredPages.length} routes from TanStack Router source`);
  }

  const pages = mergePages(discoveredPages, config);
  const resolvedConfig = resolveConfig({ ...config, outDir: config.outDir || 'public', pages });

  const result = await generateAEOFiles(resolvedConfig);
  if (result.files.length > 0) {
    console.log(`[aeo.js] Generated ${result.files.length} files`);
  }
  if (result.errors.length > 0) {
    console.error('[aeo.js] Errors:', result.errors);
  }
}
