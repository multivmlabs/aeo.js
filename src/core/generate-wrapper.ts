import { generateRobotsTxt as genRobots } from './robots';
import { generateLlmsTxt as genLlms } from './llms-txt';
import { generateLlmsFullTxt as genLlmsFull } from './llms-full';
import { copyMarkdownFiles } from './raw-markdown';
import { generateManifest as genManifest } from './manifest';
import { generateSitemap as genSitemap } from './sitemap';
import { generateAIIndex as genAIIndex } from './ai-index';
import { detectFramework } from './detect';
import { resolveConfig, getAllMarkdownFiles } from './utils';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AeoConfig, FrameworkInfo, ResolvedConfig } from '../types';

export interface GenerateResult {
  markdownFiles: string[];
  framework: FrameworkInfo | null;
  totalFiles: number;
  outputPath: string;
}

interface GenerateFiles {
  markdownFiles: string[];
  framework: FrameworkInfo | null;
  totalFiles: number;
  outputPath: string;
}

// Wrapper functions to adapt the signature
export function generateRobotsTxt(files: GenerateFiles, config: ResolvedConfig, root: string): void {
  const content = genRobots(config);
  mkdirSync(config.output || 'public/aeo', { recursive: true });
  writeFileSync(join(config.output || 'public/aeo', 'robots.txt'), content, 'utf-8');
}

export function generateLLMsTxt(files: GenerateFiles, config: ResolvedConfig, root: string): void {
  const content = genLlms(config);
  mkdirSync(config.output || 'public/aeo', { recursive: true });
  writeFileSync(join(config.output || 'public/aeo', 'llms.txt'), content, 'utf-8');
}

export function generateLLMsFullTxt(files: GenerateFiles, config: ResolvedConfig, root: string): void {
  const content = genLlmsFull(config);
  mkdirSync(config.output || 'public/aeo', { recursive: true });
  writeFileSync(join(config.output || 'public/aeo', 'llms-full.txt'), content, 'utf-8');
}

export function copyRawMarkdownFiles(files: GenerateFiles, config: ResolvedConfig, root: string): void {
  const fullConfig = {
    ...config,
    root: root || process.cwd(),
    outDir: config.output || 'public/aeo',
    generators: {
      robotsTxt: false,
      llmsTxt: false,
      llmsFullTxt: false,
      rawMarkdown: true,
      manifest: false,
      sitemap: false,
      aiIndex: false
    }
  } as ResolvedConfig;
  copyMarkdownFiles(fullConfig);
}

export function generateManifest(files: GenerateFiles, config: ResolvedConfig, root: string): void {
  const content = genManifest(config);
  mkdirSync(config.output || 'public/aeo', { recursive: true });
  writeFileSync(join(config.output || 'public/aeo', 'docs.json'), content, 'utf-8');
}

export function generateSitemap(files: GenerateFiles, config: ResolvedConfig, root: string): void {
  const content = genSitemap(config);
  mkdirSync(config.output || 'public/aeo', { recursive: true });
  writeFileSync(join(config.output || 'public/aeo', 'sitemap.xml'), content, 'utf-8');
}

export function generateAIIndex(files: GenerateFiles, config: ResolvedConfig, root: string): void {
  const content = genAIIndex(config);
  mkdirSync(config.output || 'public/aeo', { recursive: true });
  writeFileSync(join(config.output || 'public/aeo', 'ai-index.json'), content, 'utf-8');
}

export async function generateAEOFiles(
  projectRoot?: string,
  config?: Partial<AeoConfig>
): Promise<GenerateResult> {
  const root = projectRoot || process.cwd();
  const resolvedConfig = resolveConfig(config);
  const framework = detectFramework(root);
  
  const markdownFiles = getAllMarkdownFiles(
    root,
    resolvedConfig.include || ['**/*.md'],
    resolvedConfig.exclude || ['**/node_modules/**']
  );
  
  const files = {
    markdownFiles,
    framework,
    totalFiles: markdownFiles.length,
    outputPath: resolvedConfig.output || 'public/aeo'
  };
  
  // Generate robots.txt if enabled
  if (config?.generateRobots ?? resolvedConfig.generateRobots) {
    generateRobotsTxt(files, resolvedConfig, root);
  }
  
  // Generate LLMs files if enabled
  if (config?.generateLLMs ?? resolvedConfig.generateLLMs) {
    generateLLMsTxt(files, resolvedConfig, root);
    generateLLMsFullTxt(files, resolvedConfig, root);
  }
  
  // Copy raw markdown if enabled
  if (config?.generateRawMarkdown ?? resolvedConfig.generateRawMarkdown) {
    copyRawMarkdownFiles(files, resolvedConfig, root);
  }
  
  // Generate manifest if enabled
  if (config?.generateManifest ?? resolvedConfig.generateManifest) {
    generateManifest(files, resolvedConfig, root);
  }
  
  // Generate sitemap if enabled
  if (config?.generateSitemap ?? resolvedConfig.generateSitemap) {
    generateSitemap(files, resolvedConfig, root);
  }
  
  // Generate AI index if enabled
  if (config?.generateAIIndex ?? resolvedConfig.generateAIIndex) {
    generateAIIndex(files, resolvedConfig, root);
  }
  
  return files;
}