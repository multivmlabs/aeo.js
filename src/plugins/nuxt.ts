import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit';
import { generateAeoFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig } from '../types';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

export interface ModuleOptions extends AeoConfig {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'aeo',
    configKey: 'aeo',
    compatibility: {
      nuxt: '^3.0.0'
    }
  },
  
  defaults: {
    title: 'My Nuxt Site',
    description: '',
    url: 'https://example.com',
  },
  
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);
    
    // Resolve configuration with Nuxt-specific defaults
    const resolvedConfig = resolveConfig({
      ...options,
      contentDir: options.contentDir || 'content',
      outDir: options.outDir || (nuxt.options.dev ? 'public' : '.output/public'),
    });
    
    // Generate AEO files on build
    nuxt.hook('build:before', async () => {
      console.log('[aeo.js] Generating AEO files...');
      
      // Ensure output directory exists
      const outputPath = join(nuxt.options.rootDir, resolvedConfig.outDir);
      if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
      }
      
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
    });
    
    // Generate files for production build
    nuxt.hook('nitro:build:before', async (nitro) => {
      console.log('[aeo.js] Generating AEO files for production...');
      
      const prodConfig = resolveConfig({
        ...options,
        outDir: options.outDir || '.output/public',
      });
      
      const outputPath = join(nuxt.options.rootDir, prodConfig.outDir);
      if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
      }
      
      try {
        const result = await generateAeoFiles(prodConfig);
        
        if (result.files.length > 0) {
          console.log(`[aeo.js] Generated ${result.files.length} files for production`);
        }
        
        if (result.errors.length > 0) {
          console.error('[aeo.js] Errors during production generation:', result.errors);
        }
      } catch (error) {
        console.error('[aeo.js] Failed to generate production AEO files:', error);
      }
    });
    
    // Watch for content changes in development
    if (nuxt.options.dev) {
      nuxt.hook('builder:watch', async (event, path) => {
        if (path.includes(resolvedConfig.contentDir) && (path.endsWith('.md') || path.endsWith('.yml') || path.endsWith('.yaml'))) {
          console.log('[aeo.js] Content changed, regenerating AEO files...');
          
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
    
    // Add runtime plugin for widget injection
    if (resolvedConfig.widget.enabled) {
      // Create a runtime plugin file
      const pluginContent = `
import { defineNuxtPlugin } from '#app';
import { AeoWidget } from 'aeo.js/widget';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    // Initialize AEO widget
    new AeoWidget(${JSON.stringify(resolvedConfig.widget)});
  });
});
`;
      
      // Write the plugin to a temporary location
      const pluginPath = resolve(nuxt.options.buildDir, 'aeo-widget.client.js');
      writeFileSync(pluginPath, pluginContent, 'utf-8');
      
      // Add the plugin
      addPlugin({
        src: pluginPath,
        mode: 'client',
      });
    }
    
    // Add server routes for AEO files
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.publicAssets = nitroConfig.publicAssets || [];
      
      // Add AEO files as public assets
      const aeoFiles = [
        'robots.txt',
        'llms.txt',
        'llms-full.txt',
        'sitemap.xml',
        'docs.json',
        'ai-index.json',
      ];
      
      aeoFiles.forEach(file => {
        nitroConfig.publicAssets.push({
          baseURL: '/',
          dir: join(nuxt.options.rootDir, resolvedConfig.outDir),
          maxAge: 60 * 60 * 24, // 1 day cache
        });
      });
    });
    
    // Add head meta tags
    nuxt.options.app.head = nuxt.options.app.head || {};
    nuxt.options.app.head.link = nuxt.options.app.head.link || [];
    nuxt.options.app.head.meta = nuxt.options.app.head.meta || [];
    
    // Add alternate links for AEO files
    nuxt.options.app.head.link.push(
      { rel: 'alternate', type: 'text/plain', href: '/llms.txt', title: 'LLM Summary' },
      { rel: 'alternate', type: 'text/plain', href: '/llms-full.txt', title: 'Full Content for LLMs' },
      { rel: 'alternate', type: 'application/json', href: '/docs.json', title: 'Documentation Manifest' },
      { rel: 'alternate', type: 'application/json', href: '/ai-index.json', title: 'AI-Optimized Index' }
    );
    
    // Add AEO meta tags
    nuxt.options.app.head.meta.push(
      { name: 'aeo:title', content: resolvedConfig.title },
      { name: 'aeo:description', content: resolvedConfig.description },
      { name: 'aeo:url', content: resolvedConfig.url }
    );
  },
});

// Composable for use in Nuxt apps
export function useAeo() {
  // Note: This would need to be called within a Nuxt app context
  // where useRuntimeConfig is available from '#app'
  // For now, return a placeholder implementation
  return {
    config: resolveConfig({}),
    files: {
      robots: '/robots.txt',
      llms: '/llms.txt',
      llmsFull: '/llms-full.txt',
      manifest: '/docs.json',
      sitemap: '/sitemap.xml',
      aiIndex: '/ai-index.json',
    },
  };
}

// Type augmentation for Nuxt config
declare module '@nuxt/schema' {
  interface NuxtConfig {
    aeo?: ModuleOptions;
  }
  interface PublicRuntimeConfig {
    aeo?: ModuleOptions;
  }
}