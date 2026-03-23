import type { AeoConfig } from './types';

export const VERSION = '0.0.11';

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
export { generateSchema, generateSchemaObjects, generateSiteSchemas, generatePageSchemas, generateJsonLdScript } from './core/schema';
export { extractTextFromHtml, extractTitle, extractDescription, extractJsonLd, htmlToMarkdown } from './core/html-extract';
export { generateOGTags, generateOGTagsHtml } from './core/opengraph';
export { auditSite, formatAuditReport, getGrade } from './core/audit';
export type { AuditResult, AuditCategory, AuditIssue } from './core/audit';
export type { MetaTag } from './core/opengraph';
export { scorePageCitability, scoreSiteCitability, formatPageCitability } from './core/citability';
export type { PageCitabilityResult, SiteCitabilityResult, CitabilityDimension, ContentHint } from './core/citability';
export { generateReport, formatReportMarkdown, formatReportJson } from './core/report';
export type { AeoReport } from './core/report';
export { generatePlatformHints } from './core/platform-hints';
export type { PlatformHint } from './core/platform-hints';