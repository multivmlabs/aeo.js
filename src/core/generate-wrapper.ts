import { generateRobotsTxt as genRobots } from './robots';
import { generateLlmsTxt as genLlms } from './llms-txt';
import { generateLlmsFullTxt as genLlmsFull } from './llms-full';
import { copyMarkdownFiles, generatePageMarkdownFiles } from './raw-markdown';
import { generateManifest as genManifest } from './manifest';
import { generateSitemap as genSitemap } from './sitemap';
import { generateAIIndex as genAIIndex } from './ai-index';
import { resolveConfig } from './utils';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { AeoConfig, ResolvedAeoConfig } from '../types';

export interface GenerateResult {
  files: string[];
  errors: string[];
}

export async function generateAEOFiles(
  configOrRoot?: ResolvedAeoConfig | AeoConfig | string,
  maybeConfig?: Partial<AeoConfig>
): Promise<GenerateResult> {
  let config: ResolvedAeoConfig;

  if (typeof configOrRoot === 'string') {
    config = resolveConfig({ ...maybeConfig, outDir: maybeConfig?.outDir || configOrRoot });
  } else if (
    configOrRoot &&
    typeof configOrRoot === 'object' &&
    'generators' in configOrRoot &&
    typeof (configOrRoot as ResolvedAeoConfig).generators?.robotsTxt === 'boolean'
  ) {
    config = configOrRoot as ResolvedAeoConfig;
  } else {
    config = resolveConfig(configOrRoot as AeoConfig | undefined);
  }

  const outDir = config.outDir;
  const files: string[] = [];
  const errors: string[] = [];

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  if (config.generators.robotsTxt) {
    try {
      const content = genRobots(config);
      writeFileSync(join(outDir, 'robots.txt'), content, 'utf-8');
      files.push('robots.txt');
    } catch (e: any) {
      errors.push(`robots.txt: ${e.message}`);
    }
  }

  if (config.generators.llmsTxt) {
    try {
      const content = genLlms(config);
      writeFileSync(join(outDir, 'llms.txt'), '\uFEFF' + content, 'utf-8');
      files.push('llms.txt');
    } catch (e: any) {
      errors.push(`llms.txt: ${e.message}`);
    }
  }

  if (config.generators.llmsFullTxt) {
    try {
      const content = genLlmsFull(config);
      writeFileSync(join(outDir, 'llms-full.txt'), '\uFEFF' + content, 'utf-8');
      files.push('llms-full.txt');
    } catch (e: any) {
      errors.push(`llms-full.txt: ${e.message}`);
    }
  }

  if (config.generators.rawMarkdown) {
    // Generate page .md files first (auto-extracted from build output)
    try {
      const generated = generatePageMarkdownFiles(config);
      for (const f of generated) {
        files.push(f.destination);
      }
    } catch (e: any) {
      errors.push(`page-markdown: ${e.message}`);
    }

    // Then copy handwritten .md from contentDir (these take priority, overwriting generated ones)
    try {
      const copied = copyMarkdownFiles(config);
      for (const f of copied) {
        files.push(f.destination);
      }
    } catch (e: any) {
      errors.push(`raw-markdown: ${e.message}`);
    }
  }

  if (config.generators.manifest) {
    try {
      const content = genManifest(config);
      writeFileSync(join(outDir, 'docs.json'), content, 'utf-8');
      files.push('docs.json');
    } catch (e: any) {
      errors.push(`docs.json: ${e.message}`);
    }
  }

  if (config.generators.sitemap) {
    try {
      const content = genSitemap(config);
      writeFileSync(join(outDir, 'sitemap.xml'), content, 'utf-8');
      files.push('sitemap.xml');
    } catch (e: any) {
      errors.push(`sitemap.xml: ${e.message}`);
    }
  }

  if (config.generators.aiIndex) {
    try {
      const content = genAIIndex(config);
      writeFileSync(join(outDir, 'ai-index.json'), content, 'utf-8');
      files.push('ai-index.json');
    } catch (e: any) {
      errors.push(`ai-index.json: ${e.message}`);
    }
  }

  return { files, errors };
}
