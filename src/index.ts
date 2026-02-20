import type { AeoConfig, ResolvedConfig } from './types';

export const VERSION = '0.0.1';

export function defineConfig(config: AeoConfig): AeoConfig {
  return config;
}

export type { AeoConfig, ResolvedConfig, MarkdownFile, ManifestEntry, AIIndexEntry, Framework, FrameworkInfo } from './types';

export { detectFramework } from './core/detect';
export { generateAeoFiles } from './core/generate';
export { resolveConfig } from './core/utils';