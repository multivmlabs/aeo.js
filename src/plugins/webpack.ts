import type { Compiler, WebpackPluginInstance } from 'webpack';
import { generateAeoFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig } from '../types';
import { join } from 'path';

export class AeoWebpackPlugin implements WebpackPluginInstance {
  private options: AeoConfig;
  private resolvedConfig: ReturnType<typeof resolveConfig>;
  
  constructor(options: AeoConfig = {}) {
    this.options = options;
    this.resolvedConfig = resolveConfig(options);
  }
  
  apply(compiler: Compiler): void {
    const pluginName = 'AeoWebpackPlugin';
    
    // Hook into the compilation process
    compiler.hooks.beforeCompile.tapAsync(pluginName, async (params, callback) => {
      // Update output directory based on webpack config
      this.resolvedConfig = resolveConfig({
        ...this.options,
        outDir: this.options.outDir || compiler.options.output?.path || join(process.cwd(), 'dist'),
      });
      
      console.log('[aeo.js] Generating AEO files...');
      
      try {
        const result = await generateAeoFiles(this.resolvedConfig);
        
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
      
      callback();
    });
    
    // Watch for markdown file changes in development mode
    if (compiler.options.mode === 'development' && this.resolvedConfig.contentDir) {
      const contentPath = join(process.cwd(), this.resolvedConfig.contentDir);
      
      compiler.hooks.afterCompile.tap(pluginName, (compilation) => {
        // Add markdown files to watch dependencies
        const glob = join(contentPath, '**/*.md');
        compilation.contextDependencies.add(contentPath);
        
        // Note: For more granular watching, you'd need to use a glob library
        // to find all .md files and add them individually to fileDependencies
      });
      
      compiler.hooks.watchRun.tapAsync(pluginName, async (compiler, callback) => {
        // Check if any markdown files changed
        const changedFiles = Array.from(compiler.modifiedFiles || []);
        const hasMarkdownChanges = changedFiles.some(file => file.endsWith('.md'));
        
        if (hasMarkdownChanges) {
          console.log('[aeo.js] Markdown files changed, regenerating...');
          
          try {
            const result = await generateAeoFiles(this.resolvedConfig);
            
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
    
    // Emit AEO files as assets in production builds
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      // Add generated files as webpack assets
      const files = [
        'robots.txt',
        'llms.txt',
        'llms-full.txt',
        'sitemap.xml',
        'docs.json',
        'ai-index.json',
      ];
      
      files.forEach(filename => {
        const filepath = join(this.resolvedConfig.outDir, filename);
        
        // Check if file exists and add it as an asset
        try {
          const fs = require('fs');
          if (fs.existsSync(filepath)) {
            const content = fs.readFileSync(filepath);
            
            // Add to compilation assets
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
    
    // Inject widget script into HTML (when used with HtmlWebpackPlugin)
    if (this.resolvedConfig.widget.enabled) {
      compiler.hooks.compilation.tap(pluginName, (compilation) => {
        // Try to hook into HtmlWebpackPlugin if it's available
        try {
          const HtmlWebpackPlugin = require('html-webpack-plugin');
          const hooks = HtmlWebpackPlugin.getHooks(compilation);
          
          hooks.beforeEmit.tapAsync(pluginName, (data, callback) => {
            // Inject widget initialization script
            const widgetScript = `
<script type="module">
  import { AeoWidget } from 'aeo.js/widget';
  
  // Initialize AEO widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new AeoWidget(${JSON.stringify(this.resolvedConfig.widget)});
    });
  } else {
    new AeoWidget(${JSON.stringify(this.resolvedConfig.widget)});
  }
</script>`;
            
            // Inject before closing body tag
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

// Factory function for convenience
export function createAeoWebpackPlugin(options?: AeoConfig): AeoWebpackPlugin {
  return new AeoWebpackPlugin(options);
}

export default AeoWebpackPlugin;