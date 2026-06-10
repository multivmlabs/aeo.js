import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { extractTextFromHtml, extractTitle, extractDescription } from '../core/html-extract';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';

const ROUTE_EXTENSIONS = /\.(tsx|jsx|ts|js|mdx?)$/;

/**
 * Convert a Remix v2 flat-route id (file name without extension) to a pathname.
 * Returns null for routes that can't be enumerated statically (dynamic
 * segments) or that aren't pages (resource-route conventions are kept —
 * they still render at their path).
 *
 *   _index            → /
 *   about             → /about
 *   blog._index       → /blog
 *   blog.$slug        → null (dynamic)
 *   _marketing.pricing → /pricing (pathless layout segment omitted)
 *   ($lang).about     → /about (optional segment omitted)
 */
export function remixRouteToPathname(routeId: string): string | null {
  const segments: string[] = [];
  for (const rawSegment of routeId.split('.')) {
    // Trailing underscore opts out of layout nesting but keeps the path
    const segment = rawSegment.endsWith('_') ? rawSegment.slice(0, -1) : rawSegment;
    if (segment === '_index' || segment === 'index' || segment === 'route' || segment === '') continue;
    if (segment.startsWith('_')) continue; // pathless layout
    if (segment.startsWith('(') && segment.endsWith(')')) continue; // optional segment
    if (segment.includes('$')) return null; // dynamic segment
    // [escaped] segments map to their literal content
    segments.push(segment.replace(/^\[(.*)\]$/, '$1'));
  }
  return '/' + segments.join('/');
}

/**
 * Scan Remix routes from app/routes (flat files and route folders).
 */
function scanRemixRoutes(projectRoot: string): PageEntry[] {
  const pages: PageEntry[] = [];
  const routesDir = join(projectRoot, 'app', 'routes');
  if (!existsSync(routesDir)) {
    pages.push({ pathname: '/' });
    return pages;
  }

  let entries: string[];
  try {
    entries = readdirSync(routesDir);
  } catch {
    return [{ pathname: '/' }];
  }

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const fullPath = join(routesDir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    let routeId: string | null = null;
    if (stat.isFile() && ROUTE_EXTENSIONS.test(entry)) {
      routeId = entry.replace(ROUTE_EXTENSIONS, '');
    } else if (stat.isDirectory()) {
      // Folder route: app/routes/about/route.tsx
      try {
        const hasRouteFile = readdirSync(fullPath).some((f) => /^route\.(tsx|jsx|ts|js)$/.test(f));
        if (hasRouteFile) routeId = entry;
      } catch {
        continue;
      }
    }
    if (!routeId) continue;

    const pathname = remixRouteToPathname(routeId);
    if (pathname === null) continue;
    if (pages.some((p) => p.pathname === pathname)) continue;

    const segment = pathname.split('/').filter(Boolean).pop();
    pages.push({
      pathname,
      title: segment ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ') : undefined,
    });
  }

  if (!pages.some((p) => p.pathname === '/')) {
    pages.unshift({ pathname: '/' });
  }

  return pages;
}

/**
 * Detect the Remix static assets directory.
 * The Vite-based Remix / React Router 7 build writes to build/client;
 * the classic compiler serves static files from public/.
 */
function detectRemixOutputDir(projectRoot: string): string {
  const viteClient = join(projectRoot, 'build', 'client');
  if (existsSync(viteClient)) return viteClient;
  return join(projectRoot, 'public');
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
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'assets') {
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
 * Generate a widget script tag for Remix.
 * Add it to your root route so the widget loads on every page:
 *
 *   <script type="module" dangerouslySetInnerHTML={{ __html: widgetScript }} />
 */
export function getWidgetScript(config: AeoConfig = {}): string {
  const resolvedConfig = resolveConfig(config);
  if (!resolvedConfig.widget.enabled) return '';

  const widgetConfig = JSON.stringify({
    title: resolvedConfig.title,
    description: resolvedConfig.description,
    url: resolvedConfig.url,
    widget: resolvedConfig.widget,
  });

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

/**
 * Post-build function for Remix / React Router 7 projects.
 * Scans the static assets directory (build/client for Vite builds,
 * public/ for the classic compiler) plus any prerendered HTML, and
 * generates AEO files alongside the static assets so they're served
 * from the site root.
 *
 * Usage in package.json:
 *   "postbuild": "node -e \"import('aeo.js/remix').then(m => m.postBuild({ title: 'My Site', url: 'https://mysite.com' }))\""
 */
export async function postBuild(config: AeoConfig = {}): Promise<void> {
  const projectRoot = process.cwd();
  const outputDir = config.outDir || detectRemixOutputDir(projectRoot);

  console.log(`[aeo.js] Scanning Remix build output: ${outputDir}`);

  // Prerendered HTML (react-router's prerender option) lands in build/client
  const buildPages = scanHtmlOutput(outputDir);
  if (buildPages.length > 0) {
    console.log(`[aeo.js] Discovered ${buildPages.length} prerendered pages`);
  }

  const sourcePages = scanRemixRoutes(projectRoot);

  // Merge: prerendered output (with content) takes priority over source routes
  const allPages = [...buildPages, ...sourcePages, ...(config.pages || [])];
  const pageMap = new Map<string, PageEntry>();
  for (const page of allPages) {
    const existing = pageMap.get(page.pathname);
    if (!existing || (page.content && !existing.content)) {
      pageMap.set(page.pathname, page);
    }
  }

  for (const page of pageMap.values()) {
    if (page.pathname === '/' && !page.title && config.title) {
      page.title = config.title;
    }
    if (!page.description && config.description) {
      page.description = config.description;
    }
  }

  const resolvedConfig = resolveConfig({
    ...config,
    outDir: outputDir,
    pages: Array.from(pageMap.values()),
  });

  const result = await generateAEOFiles(resolvedConfig);
  if (result.files.length > 0) {
    console.log(`[aeo.js] Generated ${result.files.length} files`);
  }
  if (result.errors.length > 0) {
    console.error('[aeo.js] Errors:', result.errors);
  }
}

/**
 * Generate AEO files for Remix from source routes only (no build output).
 * Writes into public/ so the classic compiler and dev server ship them.
 */
export async function generate(config: AeoConfig = {}): Promise<void> {
  const projectRoot = process.cwd();
  const discoveredPages = scanRemixRoutes(projectRoot);

  if (discoveredPages.length > 0) {
    console.log(`[aeo.js] Discovered ${discoveredPages.length} routes from Remix source`);
  }

  for (const page of discoveredPages) {
    if (page.pathname === '/' && !page.title && config.title) {
      page.title = config.title;
    }
    if (!page.description && config.description) {
      page.description = config.description;
    }
  }

  const resolvedConfig = resolveConfig({
    ...config,
    outDir: config.outDir || 'public',
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
