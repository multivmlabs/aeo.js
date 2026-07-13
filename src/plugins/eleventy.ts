import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { extractTextFromHtml, extractTitle, extractDescription } from '../core/html-extract';

/**
 * The subset of Eleventy's config API we use. Kept local to avoid a dependency
 * on @11ty/eleventy for a plugin that only registers a transform and an event.
 */
interface EleventyConfig {
  addTransform(name: string, transform: (this: EleventyTransformThis, content: string, outputPath?: string) => string): void;
  on(event: string, handler: (arg: EleventyAfterEvent) => void | Promise<void>): void;
}

interface EleventyTransformThis {
  page?: { outputPath?: string | false; url?: string };
}

interface EleventyResult {
  inputPath?: string;
  outputPath?: string | false;
  url?: string;
  content?: string;
}

interface EleventyDirectories {
  output?: string;
}

interface EleventyAfterEvent {
  // Eleventy 3.x passes `directories`; 2.x passed `dir`. Support both.
  directories?: EleventyDirectories;
  dir?: EleventyDirectories;
  results?: EleventyResult[];
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

/** Normalize an Eleventy URL to a clean pathname (strip trailing slash, keep root). */
function normalizePathname(url: string): string {
  if (!url || url === '/') return '/';
  const clean = url.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

/**
 * Eleventy plugin for AEO.js (Eleventy 2.0+).
 *
 * Injects the AEO widget into every HTML page and, after the build, generates
 * robots.txt / sitemap.xml / llms.txt / llms-full.txt / ai-index.json / the
 * manifest from the rendered output into your Eleventy output directory.
 *
 * Usage in eleventy.config.js:
 *   const aeo = require('aeo.js/eleventy');
 *   module.exports = function (eleventyConfig) {
 *     eleventyConfig.addPlugin(aeo, { url: 'https://mysite.com', title: 'My Site' });
 *   };
 */
export default function aeoEleventy(eleventyConfig: EleventyConfig, options: AeoConfig = {}): void {
  const script = widgetScriptTag(options);

  if (script) {
    eleventyConfig.addTransform('aeo-widget', function (this: EleventyTransformThis, content: string, outputPath?: string) {
      const out = this.page?.outputPath || outputPath || '';
      if (typeof out === 'string' && out.endsWith('.html') && content.includes('</body>')) {
        return content.replace('</body>', `${script}\n</body>`);
      }
      return content;
    });
  }

  eleventyConfig.on('eleventy.after', async ({ directories, dir, results }: EleventyAfterEvent) => {
    const outputDir = options.outDir || directories?.output || dir?.output || '_site';

    const discovered: PageEntry[] = (results || [])
      .filter((r) => typeof r.outputPath === 'string' && r.outputPath.endsWith('.html'))
      .map((r) => ({
        pathname: normalizePathname(r.url || '/'),
        title: r.content ? extractTitle(r.content) : undefined,
        description: r.content ? extractDescription(r.content) : undefined,
        content: r.content ? extractTextFromHtml(r.content) : undefined,
      }))
      .filter((p) => !p.pathname.startsWith('/404'));

    // config.pages entries always win over auto-discovered ones.
    const pageMap = new Map<string, PageEntry>();
    for (const page of discovered) pageMap.set(page.pathname, page);
    for (const page of options.pages || []) pageMap.set(page.pathname, page);

    const pages = Array.from(pageMap.values());
    if (pages.length > 0) {
      console.log(`[aeo.js] Discovered ${pages.length} pages from Eleventy build output`);
    }

    const resolvedConfig = resolveConfig({ ...options, outDir: outputDir, pages });
    const result = await generateAEOFiles(resolvedConfig);
    if (result.files.length > 0) {
      console.log(`[aeo.js] Generated ${result.files.length} files`);
    }
    if (result.errors.length > 0) {
      console.error('[aeo.js] Errors:', result.errors);
    }
  });
}
