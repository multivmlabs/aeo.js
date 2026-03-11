import { readdirSync, statSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import type { ResolvedAeoConfig } from '../types';

export interface CopiedFile {
  source: string;
  destination: string;
}

export interface GeneratedMarkdownFile {
  pathname: string;
  destination: string;
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function copyRawMarkdown(config: ResolvedAeoConfig): CopiedFile[] {
  return copyMarkdownFiles(config);
}

export function copyMarkdownFiles(config: ResolvedAeoConfig): CopiedFile[] {
  const copiedFiles: CopiedFile[] = [];
  
  function copyRecursive(dir: string, base: string = config.contentDir): void {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          copyRecursive(fullPath, base);
        } else if (stat.isFile() && extname(entry) === '.md') {
          const relativePath = relative(base, fullPath);
          const destPath = join(config.outDir, relativePath);
          
          ensureDir(dirname(destPath));
          
          try {
            copyFileSync(fullPath, destPath);
            copiedFiles.push({
              source: fullPath,
              destination: destPath,
            });
          } catch (error) {
            console.warn(`Warning: Could not copy ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error);
    }
  }
  
  copyRecursive(config.contentDir);
  return copiedFiles;
}

export function generatePageMarkdownFiles(config: ResolvedAeoConfig): GeneratedMarkdownFile[] {
  const generated: GeneratedMarkdownFile[] = [];
  const pages = config.pages || [];

  for (const page of pages) {
    // Only generate .md files for pages that have actual content.
    // Pages discovered from filenames (dev mode) only have pathname/title
    // but no body content — those are useless as standalone markdown files.
    if (!page.content) continue;

    const pageTitle = page.title || (page.pathname === '/' ? config.title : undefined);

    let filename: string;
    if (page.pathname === '/') {
      filename = 'index.md';
    } else {
      const clean = page.pathname.replace(/^\//, '').replace(/\/$/, '');
      filename = clean.includes('/') ? `${clean}.md` : `${clean}.md`;
    }

    const destPath = join(config.outDir, filename);

    const pageUrl = page.pathname === '/'
      ? config.url
      : `${config.url.replace(/\/$/, '')}${page.pathname}`;

    const lines: string[] = [];

    // YAML frontmatter
    lines.push('---');
    if (pageTitle) lines.push(`title: "${pageTitle}"`);
    if (page.description) lines.push(`description: "${page.description}"`);
    lines.push(`url: ${pageUrl}`);
    lines.push(`source: ${pageUrl}`);
    lines.push(`generated_by: aeo.js`);
    lines.push('---', '');

    if (pageTitle) {
      lines.push(`# ${pageTitle}`, '');
    }

    if (page.description) {
      lines.push(`${page.description}`, '');
    }

    if (page.content) {
      lines.push(page.content);
    }

    const content = lines.join('\n');

    ensureDir(dirname(destPath));
    try {
      writeFileSync(destPath, content, 'utf-8');
      generated.push({ pathname: page.pathname, destination: destPath });
    } catch {
      // skip unwritable files
    }
  }

  return generated;
}