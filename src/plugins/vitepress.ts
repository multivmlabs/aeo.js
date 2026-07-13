import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { extractTextFromHtml, extractTitle, extractDescription } from '../core/html-extract';

/**
 * The subset of VitePress config types we touch. Kept local to avoid a
 * dependency on `vitepress` for a wrapper that only composes two build hooks.
 */
interface VitePressTransformContext {
  page: string;
  pageData?: {
    relativePath?: string;
    title?: string;
    description?: string;
    frontmatter?: Record<string, unknown>;
  };
  title?: string;
  description?: string;
  content?: string;
}

interface VitePressSiteConfig {
  outDir: string;
  site?: { title?: string; description?: string };
  sitemap?: { hostname?: string };
}

export interface VitePressUserConfig {
  transformHtml?: (code: string, id: string, ctx: VitePressTransformContext) => string | void | Promise<string | void>;
  buildEnd?: (siteConfig: VitePressSiteConfig) => void | Promise<void>;
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

/** Map a VitePress source page (e.g. `guide/index.md`) to a clean pathname. */
function pageToPathname(page: string): string {
  let p = page.replace(/\.md$/, '');
  p = p.replace(/(^|\/)index$/, '$1');
  p = '/' + p.replace(/^\/+/, '');
  return p.replace(/\/+$/, '') || '/';
}

/**
 * Wrap a VitePress config to add AEO.js support.
 *
 * During `vitepress build` it collects each page's rendered HTML (via the
 * `transformHtml` hook), injects the AEO widget, and after the build writes
 * robots.txt / sitemap.xml / llms.txt / llms-full.txt / ai-index.json / the
 * manifest into the output directory (via `buildEnd`). Any `transformHtml` /
 * `buildEnd` you already define are preserved and run first.
 *
 * Usage in .vitepress/config.ts:
 *   import { defineConfig } from 'vitepress';
 *   import { withAeo } from 'aeo.js/vitepress';
 *
 *   export default defineConfig(withAeo({
 *     title: 'My Docs',
 *     // …your VitePress config…
 *   }, { url: 'https://mysite.com' }));
 *
 * url/title/description default from the VitePress site config (and
 * `sitemap.hostname`) when omitted.
 */
export function withAeo<T extends VitePressUserConfig>(
  config: T,
  options: AeoConfig = {}
): Omit<T, 'transformHtml' | 'buildEnd'> & Required<VitePressUserConfig> {
  const script = widgetScriptTag(options);
  const collected = new Map<string, PageEntry>();

  const userTransformHtml = config.transformHtml;
  const userBuildEnd = config.buildEnd;

  return {
    ...config,

    async transformHtml(code: string, id: string, ctx: VitePressTransformContext) {
      let out = code;
      if (userTransformHtml) {
        const result = await userTransformHtml(out, id, ctx);
        if (typeof result === 'string') out = result;
      }

      const source = ctx.pageData?.relativePath || ctx.page;
      if (source) {
        const pathname = pageToPathname(source);
        if (!pathname.startsWith('/404')) {
          collected.set(pathname, {
            pathname,
            title: ctx.pageData?.title || ctx.title || undefined,
            description: ctx.pageData?.description || ctx.description || undefined,
            content: extractTextFromHtml(out) || undefined,
          });
        }
      }

      if (script && out.includes('</body>')) {
        out = out.replace('</body>', `${script}\n</body>`);
      }
      return out;
    },

    async buildEnd(siteConfig: VitePressSiteConfig) {
      if (userBuildEnd) await userBuildEnd(siteConfig);

      const config2: AeoConfig = {
        ...options,
        url: options.url || siteConfig.sitemap?.hostname || options.url,
        title: options.title || siteConfig.site?.title,
        description: options.description || siteConfig.site?.description,
      };

      // config.pages entries always win over auto-discovered ones.
      const pageMap = new Map<string, PageEntry>(collected);
      for (const page of options.pages || []) pageMap.set(page.pathname, page);

      const pages = Array.from(pageMap.values());
      if (pages.length > 0) {
        console.log(`[aeo.js] Discovered ${pages.length} pages from VitePress build`);
      }

      const resolvedConfig = resolveConfig({ ...config2, outDir: siteConfig.outDir, pages });
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

export default withAeo;

// Re-export so consumers can also inject the widget manually if they prefer.
export { widgetScriptTag as getWidgetScript };
