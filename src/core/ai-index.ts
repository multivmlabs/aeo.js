import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { createHash } from 'crypto';
import type { ResolvedAeoConfig, AIIndexEntry } from '../types';
import { parseFrontmatter, extractTitle } from './utils';

function extractKeywords(content: string): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const wordCount: Record<string, number> = {};
  
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function chunkContent(content: string, maxLength: number = 2000): string[] {
  const chunks: string[] = [];
  const paragraphs = content.split('\n\n');
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += paragraph + '\n\n';
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

function collectAIIndexEntries(dir: string, config: ResolvedAeoConfig, base: string = dir): AIIndexEntry[] {
  const entries: AIIndexEntry[] = [];
  
  try {
    const files = readdirSync(dir);
    
    for (const file of files) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        entries.push(...collectAIIndexEntries(fullPath, config, base));
      } else if (stat.isFile() && (extname(file) === '.md' || extname(file) === '.mdx')) {
        const content = readFileSync(fullPath, 'utf-8');
        const { frontmatter, content: mainContent } = parseFrontmatter(content);
        const relativePath = relative(base, fullPath);
        const urlPath = relativePath.replace(/\.mdx?$/, '');
        const url = `${config.url}/${urlPath}`;
        
        const chunks = chunkContent(mainContent);
        const title = frontmatter.title || extractTitle(mainContent);
        const keywords = extractKeywords(mainContent);
        
        chunks.forEach((chunk, index) => {
          const id = createHash('sha256')
            .update(`${url}-${index}`)
            .digest('hex')
            .slice(0, 16);
          
          entries.push({
            id,
            url,
            title: chunks.length > 1 ? `${title} (Part ${index + 1})` : title,
            content: chunk,
            description: frontmatter.description,
            keywords,
            metadata: {
              ...frontmatter,
              chunkIndex: index,
              totalChunks: chunks.length,
              sourcePath: relativePath,
            },
          });
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }
  
  return entries;
}

export function generateAiIndex(config: ResolvedAeoConfig): string {
  return generateAIIndex(config);
}

export function generateAIIndex(config: ResolvedAeoConfig): string {
  const entries: AIIndexEntry[] = [];

  // Add discovered pages from framework plugin
  if (config.pages && config.pages.length > 0) {
    for (const page of config.pages) {
      const url = `${config.url}${page.pathname === '/' ? '' : page.pathname}`;
      const title = page.title || page.pathname;
      const content = page.content || '';

      if (content) {
        const chunks = chunkContent(content);
        const keywords = extractKeywords(content);

        chunks.forEach((chunk, index) => {
          const id = createHash('sha256')
            .update(`${url}-${index}`)
            .digest('hex')
            .slice(0, 16);

          entries.push({
            id,
            url,
            title: chunks.length > 1 ? `${title} (Part ${index + 1})` : title,
            content: chunk,
            description: page.description,
            keywords,
            metadata: {
              chunkIndex: index,
              totalChunks: chunks.length,
              sourcePath: page.pathname,
            },
          });
        });
      } else {
        const id = createHash('sha256')
          .update(url)
          .digest('hex')
          .slice(0, 16);

        entries.push({
          id,
          url,
          title,
          content: page.description || title,
          description: page.description,
          keywords: [],
        });
      }
    }
  }

  // Add markdown content files
  entries.push(...collectAIIndexEntries(config.contentDir, config));
  
  const index = {
    version: '1.0',
    generated: new Date().toISOString(),
    site: {
      title: config.title,
      description: config.description,
      url: config.url,
    },
    entries: entries.sort((a, b) => a.id.localeCompare(b.id)),
    metadata: {
      totalEntries: entries.length,
      generator: 'aeo.js',
      generatorUrl: 'https://aeojs.org',
      embedding: {
        recommended: 'text-embedding-ada-002',
        dimensions: 1536,
      },
    },
  };
  
  return JSON.stringify(index, null, 2);
}