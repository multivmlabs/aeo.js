import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import type { AeoConfig, ResolvedConfig, MarkdownFile } from '../types';
import { detectFramework } from './detect';
import { minimatch } from 'minimatch';

export function resolveConfig(config: AeoConfig = {}): ResolvedConfig {
  const frameworkInfo = detectFramework();
  
  return {
    title: config.title || 'My Site',
    description: config.description || '',
    url: config.url || 'https://example.com',
    contentDir: config.contentDir || frameworkInfo.contentDir,
    outDir: config.outDir || frameworkInfo.outDir,
    generators: {
      robotsTxt: config.generators?.robotsTxt !== false,
      llmsTxt: config.generators?.llmsTxt !== false,
      llmsFullTxt: config.generators?.llmsFullTxt !== false,
      rawMarkdown: config.generators?.rawMarkdown !== false,
      manifest: config.generators?.manifest !== false,
      sitemap: config.generators?.sitemap !== false,
      aiIndex: config.generators?.aiIndex !== false,
    },
    widget: {
      enabled: config.widget?.enabled !== false,
      position: config.widget?.position || 'bottom-right',
      theme: {
        background: config.widget?.theme?.background || 'rgba(18, 18, 24, 0.9)',
        text: config.widget?.theme?.text || '#C0C0C5',
        accent: config.widget?.theme?.accent || '#E8E8EA',
        badge: config.widget?.theme?.badge || '#4ADE80',
      },
      humanLabel: config.widget?.humanLabel || 'Human',
      aiLabel: config.widget?.aiLabel || 'AI',
      showBadge: config.widget?.showBadge !== false,
    },
  };
}

export function parseFrontmatter(content: string): { frontmatter: Record<string, any>; content: string } {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)/);
  
  if (frontmatterMatch) {
    const frontmatterStr = frontmatterMatch[1];
    const contentWithoutFrontmatter = frontmatterMatch[2];
    
    const frontmatter: Record<string, any> = {};
    const lines = frontmatterStr.split('\n');
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        frontmatter[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
    
    return { frontmatter, content: contentWithoutFrontmatter };
  }
  
  return { frontmatter: {}, content };
}

export function bumpHeadings(content: string, levels: number = 1): string {
  return content.replace(/^(#{1,6})\s/gm, (match, hashes) => {
    const newLevel = Math.min(hashes.length + levels, 6);
    return '#'.repeat(newLevel) + ' ';
  });
}

export function extractTitle(content: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1];
  
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) return h2Match[1];
  
  const firstLine = content.split('\n')[0];
  return firstLine.slice(0, 100);
}

export function readPackageJson(projectRoot: string = process.cwd()): Record<string, any> {
  const packageJsonPath = join(projectRoot, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    return {};
  }
  
  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function getAllMarkdownFiles(
  projectRoot: string,
  include: string[] = ['**/*.md'],
  exclude: string[] = ['**/node_modules/**']
): string[] {
  const files: string[] = [];
  
  function scanDirectory(dir: string): void {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const relativePath = relative(projectRoot, fullPath);
        
        // Check if path should be excluded
        const shouldExclude = exclude.some(pattern => 
          minimatch(relativePath, pattern) || minimatch(fullPath, pattern)
        );
        
        if (shouldExclude) {
          continue;
        }
        
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip hidden directories
          if (!entry.startsWith('.')) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          // Check if file matches include patterns
          const shouldInclude = include.some(pattern =>
            minimatch(relativePath, pattern) || minimatch(fullPath, pattern)
          );
          
          if (shouldInclude) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }
  
  scanDirectory(projectRoot);
  return files;
}