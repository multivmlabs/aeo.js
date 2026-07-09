import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { extractTextFromHtml, extractTitle, extractDescription } from '../core/html-extract';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';

/**
 * The subset of the Docusaurus site config we read. Kept local to avoid a
 * dependency on @docusaurus/types for a plugin that only needs a few fields.
 */
interface DocusaurusSiteConfig {
  url?: string;
  baseUrl?: string;
  title?: string;
  tagline?: string;
}

interface DocusaurusContext {
  siteConfig?: DocusaurusSiteConfig;
  baseUrl?: string;
}

interface DocusaurusPostBuildProps {
  siteConfig?: DocusaurusSiteConfig;
  outDir: string;
  baseUrl?: string;
  routesPaths?: string[];
}

interface HtmlTags {
  headTags?: string[];
  preBodyTags?: string[];
  postBodyTags?: string[];
}

interface DocusaurusPlugin {
  name: string;
  injectHtmlTags(): HtmlTags;
  postBuild(props: DocusaurusPostBuildProps): Promise<void>;
}

/** Build the widget `<script>` tag string, or '' when the widget is disabled. */
function widgetScriptTag(config: AeoConfig): string {
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

/** Scan a build directory tree for prerendered HTML pages. */
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
      // Skip Docusaurus asset/build internals — they hold no page content.
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'assets' && entry !== 'img') {
        walk(fullPath, `${basePath}/${entry}`);
      } else if (entry.endsWith('.html') && entry !== '404.html') {
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
          /* skip unreadable file */
        }
      }
    }
  }

  walk(outputDir, '');
  return pages;
}

/**
 * Resolve the AEO config for a Docusaurus site, defaulting url/title/
 * description from the Docusaurus site config and folding baseUrl into the
 * site URL so generated links resolve under a project sub-path.
 */
function resolveDocusaurusConfig(options: AeoConfig, siteConfig: DocusaurusSiteConfig = {}, baseUrl?: string): AeoConfig {
  const base = (baseUrl ?? siteConfig.baseUrl ?? '/').replace(/\/$/, '');
  const siteUrl = (siteConfig.url ?? '').replace(/\/$/, '');
  return {
    ...options,
    url: options.url || (siteUrl ? siteUrl + base : options.url),
    title: options.title || siteConfig.title,
    description: options.description || siteConfig.tagline,
  };
}

/**
 * Docusaurus plugin for AEO.js.
 *
 * Injects the AEO widget on every page and, after a production build,
 * generates robots.txt / sitemap.xml / llms.txt / llms-full.txt and the
 * manifest from the built HTML output.
 *
 * Usage in docusaurus.config.js:
 *   plugins: [
 *     ['aeo.js/docusaurus', { url: 'https://mysite.com', title: 'My Docs' }],
 *   ]
 *
 * url/title/description default to the Docusaurus siteConfig when omitted.
 */
export default function aeoDocusaurus(context: DocusaurusContext = {}, options: AeoConfig = {}): DocusaurusPlugin {
  const siteConfig = context.siteConfig ?? {};
  const injectConfig = resolveDocusaurusConfig(options, siteConfig, context.baseUrl);

  return {
    name: 'aeo-docusaurus',

    injectHtmlTags() {
      const script = widgetScriptTag(injectConfig);
      return script ? { postBodyTags: [script] } : {};
    },

    async postBuild({ siteConfig: buildSiteConfig, outDir, baseUrl, routesPaths }) {
      const config = resolveDocusaurusConfig(options, buildSiteConfig ?? siteConfig, baseUrl);

      let pages = scanHtmlOutput(outDir);
      if (pages.length > 0) {
        console.log(`[aeo.js] Discovered ${pages.length} pages from Docusaurus build output`);
      } else if (routesPaths && routesPaths.length > 0) {
        // No HTML found (unexpected) — fall back to the route paths Docusaurus
        // reports, without content.
        pages = routesPaths.map((pathname) => ({ pathname }));
      }

      // config.pages entries always win over auto-discovered ones.
      const pageMap = new Map<string, PageEntry>();
      for (const page of pages) pageMap.set(page.pathname, page);
      for (const page of options.pages || []) pageMap.set(page.pathname, page);

      const resolvedConfig = resolveConfig({
        ...config,
        outDir,
        pages: Array.from(pageMap.values()),
      });

      const result = await generateAEOFiles(resolvedConfig);
      if (result.files.length > 0) {
        console.log(`[aeo.js] Generated ${result.files.length} files`);
      }
      if (result.errors.length > 0) {
        console.error('[aeo.js] Errors:', result.errors);
      }
    },
  };
}
