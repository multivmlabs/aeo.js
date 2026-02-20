import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import type { ResolvedAeoConfig, ManifestEntry } from '../types';
import { parseFrontmatter, extractTitle } from './utils';

function collectManifestEntries(dir: string, config: ResolvedAeoConfig, base: string = dir): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  
  try {
    const files = readdirSync(dir);
    
    for (const file of files) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        entries.push(...collectManifestEntries(fullPath, config, base));
      } else if (stat.isFile() && (extname(file) === '.md' || extname(file) === '.mdx')) {
        const content = readFileSync(fullPath, 'utf-8');
        const { frontmatter, content: mainContent } = parseFrontmatter(content);
        const relativePath = relative(base, fullPath);
        const urlPath = relativePath.replace(/\.mdx?$/, '');
        
        entries.push({
          url: `${config.url}/${urlPath}`,
          title: frontmatter.title || extractTitle(mainContent),
          description: frontmatter.description,
          lastModified: stat.mtime.toISOString(),
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }
  
  return entries;
}

export function generateManifest(config: ResolvedAeoConfig): string {
  const entries: ManifestEntry[] = [];

  // Add discovered pages from framework plugin
  if (config.pages && config.pages.length > 0) {
    for (const page of config.pages) {
      entries.push({
        url: `${config.url}${page.pathname === '/' ? '' : page.pathname}`,
        title: page.title || page.pathname,
        description: page.description,
      });
    }
  }

  // Add markdown content files
  entries.push(...collectManifestEntries(config.contentDir, config));
  
  const manifest = {
    version: '1.0',
    generated: new Date().toISOString(),
    site: {
      title: config.title,
      description: config.description,
      url: config.url,
    },
    documents: entries.sort((a, b) => a.url.localeCompare(b.url)),
    metadata: {
      totalDocuments: entries.length,
      generator: 'aeo.js',
      generatorUrl: 'https://aeojs.org',
    },
  };
  
  return JSON.stringify(manifest, null, 2);
}