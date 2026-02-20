import type { Plugin } from 'vite';
import { generateAeoFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig } from '../types';
import { join } from 'path';

export function aeoVitePlugin(options: AeoConfig = {}): Plugin {
  let resolvedConfig = resolveConfig(options);
  let isProduction = false;
  
  return {
    name: 'vite-plugin-aeo',
    
    configResolved(config) {
      isProduction = config.command === 'build';
      
      // Override outDir to use Vite's outDir for production builds
      if (isProduction) {
        resolvedConfig = resolveConfig({
          ...options,
          outDir: options.outDir || config.build.outDir,
        });
      } else {
        // For dev server, generate to public directory
        resolvedConfig = resolveConfig({
          ...options,
          outDir: options.outDir || join(config.root, 'public'),
        });
      }
    },
    
    async buildStart() {
      // Generate AEO files at build start (for both dev and build)
      console.log('[aeo.js] Generating AEO files...');
      
      try {
        const result = await generateAeoFiles(resolvedConfig);
        
        if (result.files.length > 0) {
          console.log(`[aeo.js] Generated ${result.files.length} files:`);
          result.files.forEach(file => {
            console.log(`  - ${file}`);
          });
        }
        
        if (result.errors.length > 0) {
          console.error('[aeo.js] Errors during generation:');
          result.errors.forEach(error => {
            console.error(`  - ${error}`);
          });
        }
      } catch (error) {
        console.error('[aeo.js] Failed to generate AEO files:', error);
      }
    },
    
    configureServer(server) {
      // Watch for content changes in dev mode
      if (resolvedConfig.contentDir) {
        server.watcher.add(join(process.cwd(), resolvedConfig.contentDir, '**/*.md'));
        
        server.watcher.on('change', async (file) => {
          if (file.endsWith('.md')) {
            console.log('[aeo.js] Markdown file changed, regenerating...');
            
            try {
              const result = await generateAeoFiles(resolvedConfig);
              
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
        });
      }
    },
    
    transformIndexHtml(html) {
      // Only inject widget in production builds or if explicitly enabled
      if (!resolvedConfig.widget.enabled) {
        return html;
      }
      
      // Add widget initialization script
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
      
      // Inject before closing body tag
      return html.replace('</body>', `${widgetScript}\n</body>`);
    },
  };
}

// Default export for convenience
export default aeoVitePlugin;