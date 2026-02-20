import type { AstroIntegration } from 'astro';
import { generateAeoFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig } from '../types';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export function aeoAstroIntegration(options: AeoConfig = {}): AstroIntegration {
  let resolvedConfig = resolveConfig(options);
  let astroConfig: any;
  
  return {
    name: 'aeo-astro',
    
    hooks: {
      'astro:config:setup': ({ config, command, updateConfig }) => {
        astroConfig = config;
        
        // Set default paths based on Astro config
        resolvedConfig = resolveConfig({
          ...options,
          contentDir: options.contentDir || 'src/content',
          outDir: options.outDir || (command === 'build' ? config.outDir.pathname : config.publicDir.pathname),
        });
        
        // Add public directory for dev server
        if (command === 'dev') {
          const publicPath = config.publicDir.pathname;
          if (!existsSync(publicPath)) {
            mkdirSync(publicPath, { recursive: true });
          }
        }
        
        // Inject widget script if enabled
        if (resolvedConfig.widget.enabled) {
          updateConfig({
            vite: {
              plugins: [
                {
                  name: 'aeo-widget-injector',
                  transformIndexHtml(html: string) {
                    const widgetScript = `
<script type="module">
  import { AeoWidget } from 'aeo.js/widget';
  
  // Initialize AEO widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new AeoWidget(${JSON.stringify(resolvedConfig.widget)});
    });
  } else {
    new AeoWidget(${JSON.stringify(resolvedConfig.widget)});
  }
</script>`;
                    
                    return html.replace('</body>', `${widgetScript}\n</body>`);
                  },
                },
              ],
            },
          });
        }
      },
      
      'astro:build:start': async ({ logger }) => {
        const buildLogger = logger.fork('aeo.js');
        buildLogger.info('Generating AEO files...');
        
        // Update outDir for production build
        resolvedConfig = resolveConfig({
          ...options,
          outDir: options.outDir || astroConfig.outDir.pathname,
        });
        
        try {
          const result = await generateAeoFiles(resolvedConfig);
          
          if (result.files.length > 0) {
            buildLogger.info(`Generated ${result.files.length} files`);
            result.files.forEach(file => {
              buildLogger.debug(`  - ${file}`);
            });
          }
          
          if (result.errors.length > 0) {
            buildLogger.error('Errors during generation:');
            result.errors.forEach(error => {
              buildLogger.error(`  - ${error}`);
            });
          }
        } catch (error) {
          buildLogger.error(`Failed to generate AEO files: ${error}`);
        }
      },
      
      'astro:server:setup': async ({ server, logger }: any) => {
        const devLogger = logger.fork('aeo.js');
        
        // Generate files on dev server start
        devLogger.info('Generating AEO files for development...');
        
        try {
          const result = await generateAeoFiles(resolvedConfig);
          
          if (result.files.length > 0) {
            devLogger.info(`Generated ${result.files.length} files`);
          }
          
          if (result.errors.length > 0) {
            devLogger.error('Errors during generation:', result.errors);
          }
        } catch (error) {
          devLogger.error(`Failed to generate AEO files: ${error}`);
        }
        
        // Watch for content changes
        if (resolvedConfig.contentDir) {
          const contentPath = join(process.cwd(), resolvedConfig.contentDir);
          
          // Watch markdown files for changes
          server.watcher.add(join(contentPath, '**/*.md'));
          server.watcher.add(join(contentPath, '**/*.mdx'));
          
          server.watcher.on('change', async (file: string) => {
            if (file.endsWith('.md') || file.endsWith('.mdx')) {
              devLogger.info('Content file changed, regenerating AEO files...');
              
              try {
                const result = await generateAeoFiles(resolvedConfig);
                
                if (result.files.length > 0) {
                  devLogger.info(`Regenerated ${result.files.length} files`);
                }
                
                if (result.errors.length > 0) {
                  devLogger.error('Errors during regeneration:', result.errors);
                }
              } catch (error) {
                devLogger.error(`Failed to regenerate AEO files: ${error}`);
              }
            }
          });
        }
      },
    },
  };
}

// Helper component for Astro pages
export const AeoMetaTags = ({ config }: { config?: AeoConfig }) => {
  const resolvedConfig = resolveConfig(config);
  
  return `
    <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM Summary" />
    <link rel="alternate" type="text/plain" href="/llms-full.txt" title="Full Content for LLMs" />
    <link rel="alternate" type="application/json" href="/docs.json" title="Documentation Manifest" />
    <link rel="alternate" type="application/json" href="/ai-index.json" title="AI-Optimized Index" />
    <meta name="aeo:title" content="${resolvedConfig.title}" />
    <meta name="aeo:description" content="${resolvedConfig.description}" />
    <meta name="aeo:url" content="${resolvedConfig.url}" />
  `;
};

// Config helper for astro.config.mjs
export function defineAeoConfig(config: AeoConfig): AeoConfig {
  return config;
}

export default aeoAstroIntegration;