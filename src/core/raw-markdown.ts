import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import type { ResolvedConfig } from '../types';

export interface CopiedFile {
  source: string;
  destination: string;
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function copyMarkdownFiles(config: ResolvedConfig): CopiedFile[] {
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