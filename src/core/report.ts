import type { ResolvedAeoConfig } from '../types';
import { auditSite, formatAuditReport } from './audit';
import type { AuditResult } from './audit';
import { scoreSiteCitability, formatPageCitability } from './citability';
import type { SiteCitabilityResult } from './citability';
import { generatePlatformHints } from './platform-hints';
import type { PlatformHint } from './platform-hints';

export interface AeoReport {
  generatedAt: string;
  site: {
    title: string;
    url: string;
    pageCount: number;
  };
  audit: AuditResult;
  citability: SiteCitabilityResult;
  platformHints: PlatformHint[];
}

/**
 * Generate a comprehensive AEO/GEO report for a site.
 */
export function generateReport(config: ResolvedAeoConfig): AeoReport {
  const audit = auditSite(config);
  const citability = scoreSiteCitability(config);
  const platformHints = generatePlatformHints(audit, citability);

  return {
    generatedAt: new Date().toISOString(),
    site: {
      title: config.title,
      url: config.url,
      pageCount: config.pages.length,
    },
    audit,
    citability,
    platformHints,
  };
}

/**
 * Format the report as markdown.
 */
export function formatReportMarkdown(report: AeoReport): string {
  const lines: string[] = [];

  lines.push(`# AEO/GEO Report — ${report.site.title}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`URL: ${report.site.url}`);
  lines.push(`Pages: ${report.site.pageCount}`);
  lines.push('');

  // GEO Readiness
  lines.push('## GEO Readiness Score');
  lines.push('');
  lines.push(formatAuditReport(report.audit));
  lines.push('');

  // Citability
  lines.push('## AI Citability');
  lines.push('');
  lines.push(`Average Citability Score: ${report.citability.averageScore}/100`);
  lines.push('');
  for (const page of report.citability.pages) {
    lines.push(formatPageCitability(page));
    lines.push('');
  }

  // Platform Insights
  lines.push('## Platform Optimization');
  lines.push('');
  for (const hint of report.platformHints) {
    const statusIcon = hint.status === 'good' ? '+' : hint.status === 'needs-work' ? '~' : '!';
    lines.push(`### ${statusIcon} ${hint.platform} (${hint.status})`);
    lines.push('');
    for (const tip of hint.tips) {
      lines.push(`- ${tip}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format the report as JSON string.
 */
export function formatReportJson(report: AeoReport): string {
  return JSON.stringify(report, null, 2);
}
