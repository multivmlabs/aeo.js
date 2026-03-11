import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { extractTextFromHtml, extractTitle, extractDescription } from '../core/html-extract';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';

/**
 * Scan Angular route components from app/ directory.
 * Looks for standalone components that represent pages (files matching *.component.ts
 * inside folders that follow Angular routing conventions).
 */
function scanAngularRoutes(projectRoot: string): PageEntry[] {
  const pages: PageEntry[] = [];
  const srcDir = join(projectRoot, 'src', 'app');
  if (!existsSync(srcDir)) {
    // Always include root even when no source directory found
    pages.push({ pathname: '/' });
    return pages;
  }

  function walk(dir: string, basePath: string = ''): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('.') && !entry.startsWith('_') && entry !== 'node_modules') {
          walk(fullPath, `${basePath}/${entry}`);
        }
      }

      // Check for route config files that define paths
      for (const entry of entries) {
        if (entry.match(/\.routes\.ts$/)) {
          try {
            const content = readFileSync(join(dir, entry), 'utf-8');
            // Extract path values from route configs: { path: 'about', ... }
            const pathMatches = content.matchAll(/path:\s*['"]([^'"]*)['"]/g);
            for (const match of pathMatches) {
              const routePath = match[1];
              if (routePath === '**' || routePath.startsWith(':')) continue;
              const pathname = routePath === '' ? '/' : `${basePath}/${routePath}`.replace(/\/+/g, '/');
              const name = routePath || 'home';
              if (!pages.some(p => p.pathname === pathname)) {
                pages.push({
                  pathname,
                  title: name === 'home' ? undefined : name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' '),
                });
              }
            }
          } catch { /* skip */ }
        }
      }

      // Fallback: infer routes from component directories with component files
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('.')) {
          const componentFile = readdirSync(fullPath).find(f => f.match(/\.component\.ts$/));
          if (componentFile && entry !== 'app' && entry !== 'shared' && entry !== 'core' && entry !== 'components' && entry !== 'services' && entry !== 'models' && entry !== 'guards' && entry !== 'interceptors' && entry !== 'pipes' && entry !== 'directives') {
            const pathname = `${basePath}/${entry}`.replace(/\/+/g, '/');
            if (!pages.some(p => p.pathname === pathname)) {
              pages.push({
                pathname,
                title: entry.charAt(0).toUpperCase() + entry.slice(1).replace(/-/g, ' '),
              });
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  walk(srcDir);

  // Always include root
  if (!pages.some(p => p.pathname === '/')) {
    pages.unshift({ pathname: '/' });
  }

  return pages;
}

/**
 * Detect Angular output directory by reading angular.json.
 * Angular v17+ outputs to dist/<project>/browser/, older versions to dist/<project>/.
 */
function detectAngularOutputDir(projectRoot: string): string {
  const angularJsonPath = join(projectRoot, 'angular.json');
  if (!existsSync(angularJsonPath)) return join(projectRoot, 'dist');

  try {
    const angularJson = JSON.parse(readFileSync(angularJsonPath, 'utf-8'));
    const defaultProject = angularJson.defaultProject || Object.keys(angularJson.projects || {})[0];
    if (!defaultProject) return join(projectRoot, 'dist');

    const project = angularJson.projects[defaultProject];
    const buildTarget = project?.architect?.build || project?.targets?.build;

    // Check outputPath from build options
    if (buildTarget?.options?.outputPath) {
      const outputPath = buildTarget.options.outputPath;
      // Angular v17+ uses object form: { base: "dist/my-app" }
      if (typeof outputPath === 'object' && outputPath.base) {
        return join(projectRoot, outputPath.base, 'browser');
      }
      return join(projectRoot, outputPath);
    }

    return join(projectRoot, 'dist', defaultProject);
  } catch {
    return join(projectRoot, 'dist');
  }
}

/**
 * Scan Angular build output for pre-rendered HTML pages.
 */
function scanAngularBuildOutput(outputDir: string): PageEntry[] {
  const pages: PageEntry[] = [];
  if (!existsSync(outputDir)) return pages;

  function walk(dir: string, basePath: string = ''): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'assets' && entry !== 'media') {
          walk(fullPath, `${basePath}/${entry}`);
        } else if (entry.endsWith('.html') && entry !== '404.html' && entry !== '500.html') {
          try {
            const html = readFileSync(fullPath, 'utf-8');
            const title = extractTitle(html);
            const description = extractDescription(html);
            const textContent = extractTextFromHtml(html);

            let pathname: string;
            if (entry === 'index.html') {
              pathname = basePath || '/';
            } else {
              pathname = `${basePath}/${entry.replace('.html', '')}`;
            }

            pages.push({
              pathname,
              title,
              description,
              content: textContent,
            });
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  walk(outputDir);
  return pages;
}

/**
 * Generate a widget script tag to inject into Angular's index.html.
 * Returns HTML string to add before </body>.
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
 * Post-build function for Angular projects.
 * Scans the Angular build output directory for pre-rendered HTML,
 * generates AEO files alongside the build output, and optionally
 * injects the widget into index.html.
 *
 * Usage in package.json:
 *   "postbuild": "node -e \"import('aeo.js/angular').then(m => m.postBuild({ title: 'My App', url: 'https://mysite.com' }))\""
 *
 * Or with Angular SSR prerender:
 *   "postbuild": "node -e \"import('aeo.js/angular').then(m => m.postBuild({ title: 'My App', url: 'https://mysite.com', injectWidget: true }))\""
 */
export async function postBuild(config: AeoConfig & { injectWidget?: boolean } = {}): Promise<void> {
  const projectRoot = process.cwd();
  const outputDir = config.outDir || detectAngularOutputDir(projectRoot);

  console.log(`[aeo.js] Scanning Angular build output: ${outputDir}`);

  // Discover pages from build output HTML
  const buildPages = scanAngularBuildOutput(outputDir);
  if (buildPages.length > 0) {
    console.log(`[aeo.js] Discovered ${buildPages.length} pages from Angular build output`);
  }

  // Discover routes from source
  const sourcePages = scanAngularRoutes(projectRoot);

  // Merge: build output (with content) takes priority over source-scanned routes
  const allPages = [...buildPages, ...sourcePages, ...(config.pages || [])];
  const pageMap = new Map<string, PageEntry>();
  for (const page of allPages) {
    const existing = pageMap.get(page.pathname);
    if (!existing || (page.content && !existing.content)) {
      pageMap.set(page.pathname, page);
    }
  }

  // Apply defaults
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

  // Optionally inject widget into index.html
  if (config.injectWidget !== false && resolvedConfig.widget.enabled) {
    const indexPath = join(outputDir, 'index.html');
    if (existsSync(indexPath)) {
      try {
        let html = readFileSync(indexPath, 'utf-8');
        if (!html.includes('aeo.js/widget')) {
          const script = getWidgetScript(config);
          html = html.replace('</body>', `${script}\n</body>`);
          const { writeFileSync } = await import('fs');
          writeFileSync(indexPath, html, 'utf-8');
          console.log('[aeo.js] Injected widget into index.html');
        }
      } catch (error) {
        console.warn('[aeo.js] Could not inject widget into index.html:', error);
      }
    }
  }
}

/**
 * Generate AEO files for Angular from source routes only (no build output).
 * Useful for dev/CI environments where build output isn't available.
 */
export async function generate(config: AeoConfig = {}): Promise<void> {
  const projectRoot = process.cwd();
  const discoveredPages = scanAngularRoutes(projectRoot);

  if (discoveredPages.length > 0) {
    console.log(`[aeo.js] Discovered ${discoveredPages.length} routes from Angular source`);
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
