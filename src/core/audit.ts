import type { ResolvedAeoConfig, PageEntry } from '../types';
import { existsSync } from 'fs';
import { join } from 'path';

export interface AuditIssue {
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  fix?: string;
}

export interface AuditCategory {
  name: string;
  score: number;   // 0-20
  maxScore: number; // 20
  checks: { label: string; passed: boolean; points: number }[];
}

export interface AuditResult {
  score: number;       // 0-100
  categories: AuditCategory[];
  issues: AuditIssue[];
  suggestions: string[];
}

/**
 * Audit a site's GEO readiness based on config and generated files.
 * Returns a 0-100 score across 5 categories (20 points each).
 */
export function auditSite(config: ResolvedAeoConfig): AuditResult {
  const categories: AuditCategory[] = [];
  const issues: AuditIssue[] = [];
  const suggestions: string[] = [];

  categories.push(auditAIAccess(config, issues));
  categories.push(auditContentStructure(config, issues, suggestions));
  categories.push(auditSchemaPresence(config, issues, suggestions));
  categories.push(auditMetaQuality(config, issues, suggestions));
  categories.push(auditCitability(config, issues, suggestions));

  const score = categories.reduce((sum, c) => sum + c.score, 0);

  return { score, categories, issues, suggestions };
}

/**
 * Category 1: AI Access (0-20)
 * Checks: robots.txt allows AI crawlers, llms.txt exists, sitemap.xml, ai-index.json, schema.json
 */
function auditAIAccess(config: ResolvedAeoConfig, issues: AuditIssue[]): AuditCategory {
  const checks: AuditCategory['checks'] = [];
  const outDir = config.outDir;

  // robots.txt enabled (4 pts)
  const robotsEnabled = config.generators.robotsTxt;
  checks.push({ label: 'robots.txt generation enabled', passed: robotsEnabled, points: robotsEnabled ? 4 : 0 });
  if (!robotsEnabled) {
    issues.push({ category: 'AI Access', severity: 'error', message: 'robots.txt generation is disabled', fix: 'Set generators.robotsTxt: true' });
  }

  // llms.txt enabled (4 pts)
  const llmsEnabled = config.generators.llmsTxt;
  checks.push({ label: 'llms.txt generation enabled', passed: llmsEnabled, points: llmsEnabled ? 4 : 0 });
  if (!llmsEnabled) {
    issues.push({ category: 'AI Access', severity: 'error', message: 'llms.txt generation is disabled — AI crawlers won\'t find your content summary', fix: 'Set generators.llmsTxt: true' });
  }

  // sitemap.xml enabled (4 pts)
  const sitemapEnabled = config.generators.sitemap;
  checks.push({ label: 'sitemap.xml generation enabled', passed: sitemapEnabled, points: sitemapEnabled ? 4 : 0 });
  if (!sitemapEnabled) {
    issues.push({ category: 'AI Access', severity: 'warning', message: 'sitemap.xml generation is disabled', fix: 'Set generators.sitemap: true' });
  }

  // ai-index.json enabled (4 pts)
  const aiIndexEnabled = config.generators.aiIndex;
  checks.push({ label: 'ai-index.json generation enabled', passed: aiIndexEnabled, points: aiIndexEnabled ? 4 : 0 });
  if (!aiIndexEnabled) {
    issues.push({ category: 'AI Access', severity: 'warning', message: 'ai-index.json generation is disabled', fix: 'Set generators.aiIndex: true' });
  }

  // No restrictive disallow rules blocking AI (4 pts)
  const hasBlockingRules = config.robots.disallow.includes('/') || config.robots.disallow.includes('/*');
  const noBlocking = !hasBlockingRules;
  checks.push({ label: 'No blanket disallow rules blocking AI crawlers', passed: noBlocking, points: noBlocking ? 4 : 0 });
  if (hasBlockingRules) {
    issues.push({ category: 'AI Access', severity: 'error', message: 'robots.txt has blanket disallow (/ or /*) which blocks AI crawlers', fix: 'Remove overly broad disallow rules from robots.disallow' });
  }

  return {
    name: 'AI Access',
    score: checks.reduce((s, c) => s + c.points, 0),
    maxScore: 20,
    checks,
  };
}

/**
 * Category 2: Content Structure (0-20)
 * Checks: pages have content, heading hierarchy, paragraph length, lists/tables
 */
function auditContentStructure(config: ResolvedAeoConfig, issues: AuditIssue[], suggestions: string[]): AuditCategory {
  const checks: AuditCategory['checks'] = [];
  const pages = config.pages;

  // Has pages defined (4 pts)
  const hasPages = pages.length > 0;
  checks.push({ label: 'Pages are defined', passed: hasPages, points: hasPages ? 4 : 0 });
  if (!hasPages) {
    issues.push({ category: 'Content Structure', severity: 'error', message: 'No pages defined — AEO files will have no content', fix: 'Add pages to your config or ensure your framework plugin scans pages' });
  }

  // Pages have content (4 pts)
  const pagesWithContent = pages.filter(p => p.content && p.content.length > 50);
  const hasContent = pagesWithContent.length > 0;
  checks.push({ label: 'Pages have extractable content', passed: hasContent, points: hasContent ? 4 : 0 });
  if (!hasContent && hasPages) {
    issues.push({ category: 'Content Structure', severity: 'warning', message: 'No pages have substantial text content (>50 chars)', fix: 'Ensure pages have meaningful text content for AI extraction' });
  }

  // Content has headings (4 pts)
  const headingPattern = /^#{1,6}\s|<h[1-6]/m;
  const pagesWithHeadings = pagesWithContent.filter(p => headingPattern.test(p.content || ''));
  const hasHeadings = pagesWithHeadings.length >= Math.max(1, Math.floor(pagesWithContent.length * 0.5));
  checks.push({ label: 'Content uses heading hierarchy', passed: hasHeadings, points: hasHeadings ? 4 : 0 });
  if (!hasHeadings && pagesWithContent.length > 0) {
    suggestions.push('Add structured headings (H1-H6) to improve AI content extraction');
  }

  // Reasonable paragraph length (4 pts — check across all pages)
  const goodParagraphLength = pagesWithContent.every(p => {
    const paragraphs = (p.content || '').split(/\n\n+/).filter(p => p.trim().length > 20);
    if (paragraphs.length === 0) return true;
    const avgWords = paragraphs.reduce((sum, para) => sum + para.split(/\s+/).length, 0) / paragraphs.length;
    return avgWords <= 200; // paragraphs shouldn't be walls of text
  });
  checks.push({ label: 'Paragraphs are reasonable length (<200 words avg)', passed: goodParagraphLength, points: goodParagraphLength ? 4 : 0 });
  if (!goodParagraphLength) {
    suggestions.push('Break up long paragraphs (>200 words) for better AI extraction — aim for 100-167 words');
  }

  // Multiple pages (4 pts)
  const multiplePages = pages.length >= 3;
  checks.push({ label: 'Site has 3+ pages for comprehensive coverage', passed: multiplePages, points: multiplePages ? 4 : 0 });
  if (!multiplePages && hasPages) {
    suggestions.push('Add more pages to improve site coverage for AI crawlers');
  }

  return {
    name: 'Content Structure',
    score: checks.reduce((s, c) => s + c.points, 0),
    maxScore: 20,
    checks,
  };
}

/**
 * Category 3: Schema Presence (0-20)
 * Checks: schema enabled, organization info, sameAs, defaultType, schema.json generated
 */
function auditSchemaPresence(config: ResolvedAeoConfig, issues: AuditIssue[], suggestions: string[]): AuditCategory {
  const checks: AuditCategory['checks'] = [];

  // Schema enabled (4 pts)
  const schemaEnabled = config.schema.enabled && config.generators.schema;
  checks.push({ label: 'Schema.org/JSON-LD generation enabled', passed: schemaEnabled, points: schemaEnabled ? 4 : 0 });
  if (!schemaEnabled) {
    issues.push({ category: 'Schema Presence', severity: 'error', message: 'Schema.org generation is disabled', fix: 'Set schema.enabled: true and generators.schema: true' });
  }

  // Organization name set (4 pts)
  const hasOrgName = config.schema.organization.name !== '' && config.schema.organization.name !== 'My Site';
  checks.push({ label: 'Organization name configured', passed: hasOrgName, points: hasOrgName ? 4 : 0 });
  if (!hasOrgName) {
    issues.push({ category: 'Schema Presence', severity: 'warning', message: 'Organization name is not configured (using default)', fix: 'Set schema.organization.name to your actual organization name' });
  }

  // Organization logo (4 pts)
  const hasLogo = !!config.schema.organization.logo;
  checks.push({ label: 'Organization logo URL set', passed: hasLogo, points: hasLogo ? 4 : 0 });
  if (!hasLogo) {
    suggestions.push('Add schema.organization.logo for richer search results and AI knowledge');
  }

  // sameAs social profiles (4 pts)
  const hasSameAs = config.schema.organization.sameAs.length > 0;
  checks.push({ label: 'Social profiles linked (sameAs)', passed: hasSameAs, points: hasSameAs ? 4 : 0 });
  if (!hasSameAs) {
    issues.push({ category: 'Schema Presence', severity: 'warning', message: 'No social profiles (sameAs) — critical for GEO/E-E-A-T signals', fix: 'Add schema.organization.sameAs with social profile URLs' });
  }

  // URL is not default (4 pts)
  const hasRealUrl = config.url !== 'https://example.com' && config.url !== '';
  checks.push({ label: 'Site URL is configured (not default)', passed: hasRealUrl, points: hasRealUrl ? 4 : 0 });
  if (!hasRealUrl) {
    issues.push({ category: 'Schema Presence', severity: 'error', message: 'Site URL is still the default (https://example.com)', fix: 'Set url to your actual site URL' });
  }

  return {
    name: 'Schema Presence',
    score: checks.reduce((s, c) => s + c.points, 0),
    maxScore: 20,
    checks,
  };
}

/**
 * Category 4: Meta Quality (0-20)
 * Checks: title length, description length, OG tags, pages have titles
 */
function auditMetaQuality(config: ResolvedAeoConfig, issues: AuditIssue[], suggestions: string[]): AuditCategory {
  const checks: AuditCategory['checks'] = [];

  // Site title exists and is good length (4 pts)
  const titleLen = config.title.length;
  const goodTitle = titleLen >= 10 && titleLen <= 70;
  checks.push({ label: 'Site title is 10-70 characters', passed: goodTitle, points: goodTitle ? 4 : 0 });
  if (titleLen < 10) {
    issues.push({ category: 'Meta Quality', severity: 'warning', message: `Site title is too short (${titleLen} chars)`, fix: 'Use a descriptive title between 10-70 characters' });
  } else if (titleLen > 70) {
    suggestions.push(`Site title is long (${titleLen} chars) — consider shortening to under 70`);
  }

  // Description exists and is good length (4 pts)
  const descLen = config.description.length;
  const goodDesc = descLen >= 50 && descLen <= 200;
  checks.push({ label: 'Site description is 50-200 characters', passed: goodDesc, points: goodDesc ? 4 : 0 });
  if (descLen === 0) {
    issues.push({ category: 'Meta Quality', severity: 'error', message: 'No site description configured', fix: 'Add a description (50-200 characters)' });
  } else if (descLen < 50) {
    issues.push({ category: 'Meta Quality', severity: 'warning', message: `Description is too short (${descLen} chars)`, fix: 'Expand description to 50-200 characters' });
  }

  // OG tags enabled (4 pts)
  const ogEnabled = config.og.enabled;
  checks.push({ label: 'Open Graph meta tags enabled', passed: ogEnabled, points: ogEnabled ? 4 : 0 });
  if (!ogEnabled) {
    issues.push({ category: 'Meta Quality', severity: 'warning', message: 'OG meta tags are disabled — social sharing and AI previews will be limited', fix: 'Set og.enabled: true' });
  }

  // Pages have titles (4 pts)
  const pagesWithTitles = config.pages.filter(p => p.title && p.title.length > 0);
  const titleCoverage = config.pages.length > 0 ? pagesWithTitles.length / config.pages.length : 0;
  const goodTitleCoverage = titleCoverage >= 0.8;
  checks.push({ label: '80%+ of pages have titles', passed: goodTitleCoverage, points: goodTitleCoverage ? 4 : 0 });
  if (!goodTitleCoverage && config.pages.length > 0) {
    issues.push({ category: 'Meta Quality', severity: 'warning', message: `Only ${pagesWithTitles.length}/${config.pages.length} pages have titles`, fix: 'Add titles to all pages' });
  }

  // Pages have descriptions (4 pts)
  const pagesWithDesc = config.pages.filter(p => p.description && p.description.length > 0);
  const descCoverage = config.pages.length > 0 ? pagesWithDesc.length / config.pages.length : 0;
  const goodDescCoverage = descCoverage >= 0.5;
  checks.push({ label: '50%+ of pages have descriptions', passed: goodDescCoverage, points: goodDescCoverage ? 4 : 0 });
  if (!goodDescCoverage && config.pages.length > 0) {
    suggestions.push(`Only ${pagesWithDesc.length}/${config.pages.length} pages have descriptions — add per-page descriptions`);
  }

  return {
    name: 'Meta Quality',
    score: checks.reduce((s, c) => s + c.points, 0),
    maxScore: 20,
    checks,
  };
}

/**
 * Category 5: Citability (0-20)
 * Checks: self-contained paragraphs, direct answers, statistical content, FAQ patterns
 */
function auditCitability(config: ResolvedAeoConfig, issues: AuditIssue[], suggestions: string[]): AuditCategory {
  const checks: AuditCategory['checks'] = [];
  const allContent = config.pages.map(p => p.content || '').join('\n\n');

  // Has direct answer patterns (4 pts) — sentences that start with a noun/subject and make a claim
  const directAnswerPattern = /^[A-Z][^.!?]{20,150}[.!?]/m;
  const hasDirectAnswers = directAnswerPattern.test(allContent);
  checks.push({ label: 'Content has direct answer patterns', passed: hasDirectAnswers, points: hasDirectAnswers ? 4 : 0 });
  if (!hasDirectAnswers) {
    suggestions.push('Add self-contained factual statements that AI can cite directly');
  }

  // Has statistical/factual content (4 pts) — numbers, percentages, dates
  const statPattern = /\d+%|\$[\d,.]+|\d{4}|\d+\s*(million|billion|thousand|users|customers|downloads)/i;
  const hasStats = statPattern.test(allContent);
  checks.push({ label: 'Content includes statistics/factual claims', passed: hasStats, points: hasStats ? 4 : 0 });
  if (!hasStats) {
    suggestions.push('Include concrete statistics, numbers, and dates — AI favors content with factual claims');
  }

  // Has FAQ-like patterns (4 pts)
  const faqPattern = /^#{1,6}\s+.+\?\s*$/m;
  const hasFaq = faqPattern.test(allContent);
  checks.push({ label: 'Content has FAQ patterns (question headings)', passed: hasFaq, points: hasFaq ? 4 : 0 });
  if (!hasFaq) {
    suggestions.push('Add FAQ sections with question headings — these generate FAQPage schema automatically');
  }

  // Has structured lists (4 pts)
  const listPattern = /^[\s]*[-*+]\s|^\d+\.\s/m;
  const hasLists = listPattern.test(allContent);
  checks.push({ label: 'Content uses lists for structured information', passed: hasLists, points: hasLists ? 4 : 0 });
  if (!hasLists) {
    suggestions.push('Use bullet or numbered lists for key information — improves AI extraction');
  }

  // Content is substantial (4 pts) — at least 500 words total
  const wordCount = allContent.split(/\s+/).filter(w => w.length > 0).length;
  const substantialContent = wordCount >= 500;
  checks.push({ label: 'Total content is substantial (500+ words)', passed: substantialContent, points: substantialContent ? 4 : 0 });
  if (!substantialContent) {
    issues.push({ category: 'Citability', severity: 'warning', message: `Total content is only ${wordCount} words`, fix: 'Add more content — aim for at least 500 words across all pages' });
  }

  return {
    name: 'Citability',
    score: checks.reduce((s, c) => s + c.points, 0),
    maxScore: 20,
    checks,
  };
}

/**
 * Format audit result as a human-readable report string.
 */
export function formatAuditReport(result: AuditResult): string {
  const lines: string[] = [];
  const grade = getGrade(result.score);

  lines.push(`GEO Readiness Score: ${result.score}/100 (${grade})`);
  lines.push('═'.repeat(50));
  lines.push('');

  for (const cat of result.categories) {
    lines.push(`${cat.name}: ${cat.score}/${cat.maxScore}`);
    const bar = '█'.repeat(cat.score) + '░'.repeat(cat.maxScore - cat.score);
    lines.push(`  ${bar}`);
    for (const check of cat.checks) {
      lines.push(`  ${check.passed ? '+' : '-'} ${check.label}`);
    }
    lines.push('');
  }

  if (result.issues.length > 0) {
    lines.push('Issues:');
    for (const issue of result.issues) {
      const icon = issue.severity === 'error' ? '!' : issue.severity === 'warning' ? '~' : 'i';
      lines.push(`  ${icon} [${issue.category}] ${issue.message}`);
      if (issue.fix) lines.push(`    Fix: ${issue.fix}`);
    }
    lines.push('');
  }

  if (result.suggestions.length > 0) {
    lines.push('Suggestions:');
    for (const suggestion of result.suggestions) {
      lines.push(`  * ${suggestion}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function getGrade(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 25) return 'Needs Work';
  return 'Poor';
}
