import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { extractTextFromHtml, extractTitle, extractDescription } from '../core/html-extract';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';

/**
 * Scan SvelteKit routes from src/routes.
 * Directories map to URL segments; (group) segments are transparent and
 * dynamic segments ([param], [...rest]) are skipped since they can't be
 * enumerated statically. A directory is a page when it contains
 * +page.svelte (or +page.md / +page.svx via mdsvex).
 */
function scanSvelteKitRoutes(projectRoot: string): PageEntry[] {
  const pages: PageEntry[] = [];
  const routesDir = join(projectRoot, 'src', 'routes');
  if (!existsSync(routesDir)) {
    pages.push({ pathname: '/' });
    return pages;
  }

  const PAGE_FILES = ['+page.svelte', '+page.md', '+page.svx'];

  function walk(dir: string, basePath: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    if (entries.some((e) => PAGE_FILES.includes(e))) {
      const pathname = basePath || '/';
      if (!pages.some((p) => p.pathname === pathname)) {
        const segment = pathname.split('/').filter(Boolean).pop();
        pages.push({
          pathname,
          title: segment ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ') : undefined,
        });
      }
    }

    for (const entry of entries) {
      if (entry.startsWith('.') || entry.startsWith('[')) continue;
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;
      // Route groups like (marketing) don't contribute a URL segment
      const segment = entry.startsWith('(') && entry.endsWith(')') ? '' : `/${entry}`;
      walk(fullPath, `${basePath}${segment}`);
    }
  }

  walk(routesDir, '');

  if (!pages.some((p) => p.pathname === '/')) {
    pages.unshift({ pathname: '/' });
  }

  return pages;
}

/**
 * Detect the SvelteKit output directory.
 * adapter-static writes to build/; other adapters keep prerendered pages
 * under .svelte-kit/output and serve static assets from the client dir.
 */
function detectSvelteKitOutputDir(projectRoot: string): string {
  const staticBuild = join(projectRoot, 'build');
  if (existsSync(staticBuild)) return staticBuild;

  const clientDir = join(projectRoot, '.svelte-kit', 'output', 'client');
  if (existsSync(clientDir)) return clientDir;

  return staticBuild;
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
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== '_app') {
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
 * Generate a widget script tag to inject into prerendered HTML.
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

/** Inject the widget script into every prerendered HTML page that lacks it. */
function injectWidgetIntoHtml(outputDir: string, config: AeoConfig): number {
  const script = getWidgetScript(config);
  if (!script) return 0;

  let injected = 0;
  function walk(dir: string): void {
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
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== '_app') {
        walk(fullPath);
      } else if (entry.endsWith('.html') && entry !== '404.html' && entry !== '500.html') {
        try {
          const html = readFileSync(fullPath, 'utf-8');
          if (html.includes('aeo.js/widget') || !html.includes('</body>')) continue;
          writeFileSync(fullPath, html.replace('</body>', `${script}\n</body>`), 'utf-8');
          injected++;
        } catch {
          /* skip */
        }
      }
    }
  }

  walk(outputDir);
  return injected;
}

/**
 * Post-build function for SvelteKit projects.
 * Scans the build output (adapter-static's build/ or .svelte-kit/output)
 * for prerendered HTML, generates AEO files alongside it, and optionally
 * injects the widget into every prerendered page.
 *
 * Usage in package.json:
 *   "postbuild": "node -e \"import('aeo.js/sveltekit').then(m => m.postBuild({ title: 'My Site', url: 'https://mysite.com' }))\""
 */
export async function postBuild(config: AeoConfig & { injectWidget?: boolean } = {}): Promise<void> {
  const projectRoot = process.cwd();
  const outputDir = config.outDir || detectSvelteKitOutputDir(projectRoot);

  console.log(`[aeo.js] Scanning SvelteKit build output: ${outputDir}`);

  const buildPages = scanHtmlOutput(outputDir);

  // Non-static adapters keep prerendered pages in a separate directory
  const prerenderedDir = join(projectRoot, '.svelte-kit', 'output', 'prerendered', 'pages');
  const prerenderedPages = outputDir.includes('.svelte-kit') ? scanHtmlOutput(prerenderedDir) : [];

  const discovered = [...buildPages, ...prerenderedPages];
  if (discovered.length > 0) {
    console.log(`[aeo.js] Discovered ${discovered.length} pages from SvelteKit build output`);
  }

  const sourcePages = scanSvelteKitRoutes(projectRoot);

  // Merge priority (highest to lowest):
  //   1. config.pages (explicit user overrides — always win)
  //   2. discovered HTML pages with content
  //   3. source-scanned routes (lowest priority)
  const pageMap = new Map<string, PageEntry>();
  // Layer in discovered and source pages first (lower priority)
  for (const page of [...discovered, ...sourcePages]) {
    const existing = pageMap.get(page.pathname);
    if (!existing || (page.content && !existing.content)) {
      pageMap.set(page.pathname, page);
    }
  }
  // User-provided pages always win — overwrite whatever was discovered
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

  if (config.injectWidget !== false && resolvedConfig.widget.enabled) {
    // For non-static adapters the client dir only holds JS/CSS bundles.
    // Prerendered HTML lives under .svelte-kit/output/prerendered/pages.
    const widgetDirs: string[] = [outputDir];
    if (outputDir.includes('.svelte-kit')) {
      widgetDirs.push(join(projectRoot, '.svelte-kit', 'output', 'prerendered', 'pages'));
    }
    let injected = 0;
    for (const dir of widgetDirs) {
      injected += injectWidgetIntoHtml(dir, config);
    }
    if (injected > 0) {
      console.log(`[aeo.js] Injected widget into ${injected} page(s)`);
    }
  }
}

/**
 * Generate AEO files for SvelteKit from source routes only (no build output).
 * Writes into static/ so the files ship with any adapter. Useful for dev.
 */
export async function generate(config: AeoConfig = {}): Promise<void> {
  const projectRoot = process.cwd();
  const discoveredPages = scanSvelteKitRoutes(projectRoot);

  if (discoveredPages.length > 0) {
    console.log(`[aeo.js] Discovered ${discoveredPages.length} routes from SvelteKit source`);
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
    outDir: config.outDir || 'static',
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
