import type { NextConfig } from 'next';
import { generateAeoFiles } from '../core/generate';
import { resolveConfig } from '../core/utils';
import type { AeoConfig } from '../types';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import React from 'react';

export interface NextAeoConfig extends NextConfig {
  aeo?: AeoConfig;
}

export function withAeo(nextConfig: NextAeoConfig = {}): NextConfig {
  const aeoOptions = nextConfig.aeo || {};
  
  return {
    ...nextConfig,
    
    webpack(config, options) {
      // Call the original webpack function if it exists
      if (typeof nextConfig.webpack === 'function') {
        config = nextConfig.webpack(config, options);
      }
      
      // Generate AEO files during build
      if (!options.isServer && !options.dev) {
        const resolvedConfig = resolveConfig({
          ...aeoOptions,
          outDir: aeoOptions.outDir || join(process.cwd(), 'public'),
        });
        
        // Ensure public directory exists
        if (!existsSync(resolvedConfig.outDir)) {
          mkdirSync(resolvedConfig.outDir, { recursive: true });
        }
        
        // Add webpack plugin to generate files
        config.plugins.push({
          apply: (compiler: any) => {
            compiler.hooks.beforeCompile.tapAsync('AeoPlugin', async (params: any, callback: any) => {
              console.log('[aeo.js] Generating AEO files for Next.js...');
              
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
              
              callback();
            });
          }
        });
      }
      
      return config;
    },
    
    async rewrites() {
      const originalRewrites = nextConfig.rewrites;
      const rewrites = typeof originalRewrites === 'function'
        ? await originalRewrites()
        : originalRewrites || [];
      
      // Add rewrites for AEO files if they're generated in a different location
      const aeoRewrites = [
        {
          source: '/robots.txt',
          destination: '/robots.txt',
        },
        {
          source: '/llms.txt',
          destination: '/llms.txt',
        },
        {
          source: '/llms-full.txt',
          destination: '/llms-full.txt',
        },
        {
          source: '/sitemap.xml',
          destination: '/sitemap.xml',
        },
        {
          source: '/docs.json',
          destination: '/docs.json',
        },
        {
          source: '/ai-index.json',
          destination: '/ai-index.json',
        },
      ];
      
      // Handle both array and object return types from original rewrites
      if (Array.isArray(rewrites)) {
        return [...rewrites, ...aeoRewrites];
      } else {
        return {
          ...rewrites,
          afterFiles: [...(rewrites.afterFiles || []), ...aeoRewrites],
        };
      }
    },
  };
}

// Hook for App Router metadata
export async function generateAeoMetadata(config?: AeoConfig) {
  const resolvedConfig = resolveConfig(config);
  
  // Generate files during build
  if (process.env.NODE_ENV === 'production') {
    await generateAeoFiles(resolvedConfig);
  }
  
  return {
    title: resolvedConfig.title,
    description: resolvedConfig.description,
    metadataBase: new URL(resolvedConfig.url),
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      types: {
        'text/plain': [
          { url: '/llms.txt', title: 'LLM Summary' },
          { url: '/llms-full.txt', title: 'Full Content for LLMs' },
        ],
        'application/json': [
          { url: '/docs.json', title: 'Documentation Manifest' },
          { url: '/ai-index.json', title: 'AI-Optimized Index' },
        ],
      },
    },
  };
}

// Component for pages router
export function AeoHead({ config }: { config?: AeoConfig }) {
  const resolvedConfig = resolveConfig(config);
  
  return React.createElement(
    React.Fragment,
    null,
    React.createElement('link', {
      rel: 'alternate',
      type: 'text/plain',
      href: '/llms.txt',
      title: 'LLM Summary',
    }),
    React.createElement('link', {
      rel: 'alternate',
      type: 'text/plain',
      href: '/llms-full.txt',
      title: 'Full Content for LLMs',
    }),
    React.createElement('link', {
      rel: 'alternate',
      type: 'application/json',
      href: '/docs.json',
      title: 'Documentation Manifest',
    }),
    React.createElement('link', {
      rel: 'alternate',
      type: 'application/json',
      href: '/ai-index.json',
      title: 'AI-Optimized Index',
    }),
    React.createElement('meta', {
      name: 'aeo:title',
      content: resolvedConfig.title,
    }),
    React.createElement('meta', {
      name: 'aeo:description',
      content: resolvedConfig.description,
    }),
    React.createElement('meta', {
      name: 'aeo:url',
      content: resolvedConfig.url,
    })
  );
}

export default withAeo;