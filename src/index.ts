import type { AeoConfig } from './types';

export const VERSION = '0.0.2';

export function defineConfig(config: AeoConfig): AeoConfig {
  return config;
}

// Export all types
export type {
  AeoConfig,
  ResolvedAeoConfig,
  PageEntry,
  DocEntry,
  AeoManifest,
  MarkdownFile,
  ManifestEntry,
  AIIndexEntry,
  FrameworkType,
  FrameworkInfo
} from './types';

// Export core functions
export { detectFramework } from './core/detect';
export { generateAEOFiles as generateAll, generateAEOFiles } from './core/generate';
export { resolveConfig, validateConfig } from './core/utils';