import { generateAEOFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig, PageEntry } from '../types';
import { join } from 'path';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';

function scanHtmlAssets(compilation: any): PageEntry[] {
  const pages: PageEntry[] = [];
  try {
    for (const [name, source] of Object.entries(compilation.assets)) {
      if (name.endsWith('.html') && name !== '404.html' && name !== '500.html') {
        const html = (source as any).source?.().toString() || '';
        const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
        let pathname = '/' + name.replace(/\/?index\.html$/, '').replace(/\.html$/, '');
        pathname = pathname.replace(/\/+/g, '/') || '/';
        pages.push({
          pathname,
          title: titleMatch?.[1]?.split('|')[0]?.trim(),
          description: descMatch?.[1],
        });
      }
    }
  } catch { /* skip */ }
  return pages;
}

export class AeoWebpackPlugin {
  private options: AeoConfig;
  private resolvedConfig: ReturnType<typeof resolveConfig>;

  constructor(options: AeoConfig = {}) {
    this.options = options;
    this.resolvedConfig = resolveConfig(options);
  }

  apply(compiler: any): void {
    const pluginName = 'AeoWebpackPlugin';

    compiler.hooks.beforeCompile.tapAsync(pluginName, async (_params: any, callback: any) => {
      this.resolvedConfig = resolveConfig({
        ...this.options,
        outDir: this.options.outDir || compiler.options.output?.path || join(process.cwd(), 'dist'),
      });

      console.log('[aeo.js] Generating AEO files...');

      try {
        const result = await generateAEOFiles(this.resolvedConfig);

        if (result.files.length > 0) {
          console.log(`[aeo.js] Generated ${result.files.length} files:`);
          result.files.forEach((file: string) => {
            console.log(`  - ${file}`);
          });
        }

        if (result.errors.length > 0) {
          console.error('[aeo.js] Errors during generation:');
          result.errors.forEach((error: string) => {
            console.error(`  - ${error}`);
          });
        }
      } catch (error) {
        console.error('[aeo.js] Failed to generate AEO files:', error);
      }

      callback();
    });

    if (compiler.options.mode === 'development' && this.resolvedConfig.contentDir) {
      const contentPath = join(process.cwd(), this.resolvedConfig.contentDir);

      compiler.hooks.afterCompile.tap(pluginName, (compilation: any) => {
        compilation.contextDependencies.add(contentPath);
      });

      compiler.hooks.watchRun.tapAsync(pluginName, async (comp: any, callback: any) => {
        const changedFiles = Array.from(comp.modifiedFiles || []) as string[];
        const hasMarkdownChanges = changedFiles.some((file: string) => file.endsWith('.md'));

        if (hasMarkdownChanges) {
          console.log('[aeo.js] Markdown files changed, regenerating...');

          try {
            const result = await generateAEOFiles(this.resolvedConfig);
            if (result.files.length > 0) {
              console.log(`[aeo.js] Regenerated ${result.files.length} files`);
            }
            if (result.errors.length > 0) {
              console.error('[aeo.js] Errors during regeneration:', result.errors);
            }
          } catch (error) {
            console.error('[aeo.js] Failed to regenerate AEO files:', error);
          }
        }

        callback();
      });
    }

    compiler.hooks.emit.tapAsync(pluginName, async (compilation: any, callback: any) => {
      // Discover pages from HTML assets in the compilation
      const discoveredPages = scanHtmlAssets(compilation);
      if (discoveredPages.length > 0) {
        console.log(`[aeo.js] Discovered ${discoveredPages.length} pages from build output`);
        this.resolvedConfig = resolveConfig({
          ...this.options,
          outDir: this.resolvedConfig.outDir,
          pages: [...(this.options.pages || []), ...discoveredPages],
        });

        // Regenerate with page data
        try {
          await generateAEOFiles(this.resolvedConfig);
        } catch (error) {
          console.error('[aeo.js] Failed to regenerate with pages:', error);
        }
      }

      const aeoFiles = ['robots.txt', 'llms.txt', 'llms-full.txt', 'sitemap.xml', 'docs.json', 'ai-index.json'];

      aeoFiles.forEach(filename => {
        const filepath = join(this.resolvedConfig.outDir, filename);
        try {
          if (existsSync(filepath)) {
            const content = readFileSync(filepath);
            compilation.assets[filename] = {
              source: () => content,
              size: () => content.length,
            };
          }
        } catch (error) {
          console.warn(`[aeo.js] Could not add ${filename} to assets:`, error);
        }
      });

      callback();
    });

    if (this.resolvedConfig.widget.enabled) {
      compiler.hooks.compilation.tap(pluginName, (compilation: any) => {
        try {
          const HtmlWebpackPlugin = require('html-webpack-plugin');
          const hooks = HtmlWebpackPlugin.getHooks(compilation);

          hooks.beforeEmit.tapAsync(pluginName, (data: any, callback: any) => {
            const widgetScript = `
<script type="module">
  import { AeoWidget } from 'aeo.js/widget';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new AeoWidget(${JSON.stringify(this.resolvedConfig.widget)});
    });
  } else {
    new AeoWidget(${JSON.stringify(this.resolvedConfig.widget)});
  }
</script>`;
            data.html = data.html.replace('</body>', `${widgetScript}\n</body>`);
            callback(null, data);
          });
        } catch (error) {
          // HtmlWebpackPlugin not available, skip widget injection
        }
      });
    }
  }
}

export function createAeoWebpackPlugin(options?: AeoConfig): AeoWebpackPlugin {
  return new AeoWebpackPlugin(options);
}

export default AeoWebpackPlugin;
