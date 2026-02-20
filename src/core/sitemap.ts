import { readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import type { ResolvedAeoConfig } from '../types';

function collectUrls(dir: string, config: ResolvedAeoConfig, base: string = dir): string[] {
  const urls: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        urls.push(...collectUrls(fullPath, config, base));
      } else if (stat.isFile() && (extname(entry) === '.md' || extname(entry) === '.mdx' || extname(entry) === '.html')) {
        const relativePath = relative(base, fullPath);
        const urlPath = relativePath.replace(/\.(md|mdx|html)$/, '');
        urls.push(`${config.url}/${urlPath}`);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }
  
  return urls;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSitemap(config: ResolvedAeoConfig): string {
  const urls: string[] = [];

  // Add discovered pages from framework plugin
  if (config.pages && config.pages.length > 0) {
    for (const page of config.pages) {
      urls.push(`${config.url}${page.pathname === '/' ? '' : page.pathname}`);
    }
  }

  // Add markdown/html files from content dir
  if (config.contentDir) {
    urls.push(...collectUrls(config.contentDir, config));
  }

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  // Always include the site root
  urls.push(config.url);

  const uniqueUrls = [...new Set(urls)].sort();
  
  for (const url of uniqueUrls) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(url)}</loc>`);
    lines.push(`    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>`);
    lines.push('    <changefreq>weekly</changefreq>');
    lines.push('    <priority>0.8</priority>');
    lines.push('  </url>');
  }
  
  lines.push('</urlset>');
  
  return lines.join('\n');
}