import type { AuditResult } from './audit';
import type { PageCitabilityResult } from './citability';

export interface PlatformHint {
  platform: string;
  status: 'good' | 'needs-work' | 'critical';
  tips: string[];
}

/**
 * Generate platform-specific optimization hints based on audit and citability results.
 * These are static recommendations — no live API calls.
 */
export function generatePlatformHints(audit: AuditResult, citability?: { averageScore: number }): PlatformHint[] {
  const hints: PlatformHint[] = [];

  hints.push(chatgptHints(audit, citability));
  hints.push(perplexityHints(audit, citability));
  hints.push(googleAIHints(audit, citability));
  hints.push(bingCopilotHints(audit, citability));

  return hints;
}

function chatgptHints(audit: AuditResult, citability?: { averageScore: number }): PlatformHint {
  const tips: string[] = [];
  const aiAccess = audit.categories.find(c => c.name === 'AI Access');
  const schema = audit.categories.find(c => c.name === 'Schema Presence');
  const content = audit.categories.find(c => c.name === 'Content Structure');

  // ChatGPT/SearchGPT prioritizes: GPTBot access, Article schema, answer blocks
  const llmsCheck = aiAccess?.checks.find(c => c.label.includes('llms.txt'));
  if (!llmsCheck?.passed) {
    tips.push('Enable llms.txt — ChatGPT uses this to understand your site content');
  }

  const robotsCheck = aiAccess?.checks.find(c => c.label.includes('blanket disallow'));
  if (!robotsCheck?.passed) {
    tips.push('Allow GPTBot in robots.txt — blanket disallow blocks ChatGPT crawling');
  }

  if (schema && schema.score < 12) {
    tips.push('Add Article or WebPage schema — helps ChatGPT extract structured content');
  }

  if (citability && citability.averageScore < 50) {
    tips.push('Improve answer blocks — ChatGPT citations favor self-contained factual paragraphs');
  }

  if (content && content.score < 12) {
    tips.push('Add more structured content — headings and paragraphs help SearchGPT parse your pages');
  }

  if (tips.length === 0) tips.push('Your site is well-optimized for ChatGPT/SearchGPT');

  return {
    platform: 'ChatGPT / SearchGPT',
    status: tips.length <= 1 ? 'good' : tips.length <= 3 ? 'needs-work' : 'critical',
    tips,
  };
}

function perplexityHints(audit: AuditResult, citability?: { averageScore: number }): PlatformHint {
  const tips: string[] = [];
  const meta = audit.categories.find(c => c.name === 'Meta Quality');
  const citabilityScore = audit.categories.find(c => c.name === 'Citability');

  // Perplexity prioritizes: statistical claims, source citations, heading hierarchy
  if (citabilityScore && citabilityScore.score < 12) {
    tips.push('Add statistical claims and concrete data — Perplexity favors cite-able facts');
  }

  if (meta && meta.score < 12) {
    tips.push('Improve page titles and descriptions — Perplexity uses meta tags for source attribution');
  }

  const faqCheck = citabilityScore?.checks.find(c => c.label.includes('FAQ'));
  if (!faqCheck?.passed) {
    tips.push('Add FAQ sections with question headings — Perplexity surfaces Q&A content prominently');
  }

  if (citability && citability.averageScore < 40) {
    tips.push('Improve self-contained paragraphs — Perplexity extracts and cites individual passages');
  }

  if (tips.length === 0) tips.push('Your site is well-optimized for Perplexity');

  return {
    platform: 'Perplexity',
    status: tips.length <= 1 ? 'good' : tips.length <= 3 ? 'needs-work' : 'critical',
    tips,
  };
}

function googleAIHints(audit: AuditResult, citability?: { averageScore: number }): PlatformHint {
  const tips: string[] = [];
  const schema = audit.categories.find(c => c.name === 'Schema Presence');

  // Google AI Overviews: E-E-A-T signals, Organization+sameAs, freshness, structured data
  const orgCheck = schema?.checks.find(c => c.label.includes('Organization'));
  if (!orgCheck?.passed) {
    tips.push('Configure Organization name — Google AI uses this for E-E-A-T authority signals');
  }

  const sameAsCheck = schema?.checks.find(c => c.label.includes('sameAs'));
  if (!sameAsCheck?.passed) {
    tips.push('Add sameAs social profiles — critical for Google Knowledge Panel and E-E-A-T');
  }

  const logoCheck = schema?.checks.find(c => c.label.includes('logo'));
  if (!logoCheck?.passed) {
    tips.push('Add Organization logo — enhances Google search presence and AI Overviews');
  }

  const schemaEnabled = schema?.checks.find(c => c.label.includes('JSON-LD'));
  if (!schemaEnabled?.passed) {
    tips.push('Enable Schema.org/JSON-LD — Google AI Overviews heavily rely on structured data');
  }

  if (tips.length === 0) tips.push('Your site is well-optimized for Google AI Overviews');

  return {
    platform: 'Google AI Overviews',
    status: tips.length <= 1 ? 'good' : tips.length <= 3 ? 'needs-work' : 'critical',
    tips,
  };
}

function bingCopilotHints(audit: AuditResult, citability?: { averageScore: number }): PlatformHint {
  const tips: string[] = [];
  const aiAccess = audit.categories.find(c => c.name === 'AI Access');
  const meta = audit.categories.find(c => c.name === 'Meta Quality');

  // Bing Copilot: Bingbot access, OG metadata, FAQ content, sitemap
  const robotsCheck = aiAccess?.checks.find(c => c.label.includes('blanket disallow'));
  if (!robotsCheck?.passed) {
    tips.push('Remove blanket disallow — Bing Copilot requires Bingbot access');
  }

  const sitemapCheck = aiAccess?.checks.find(c => c.label.includes('sitemap'));
  if (!sitemapCheck?.passed) {
    tips.push('Enable sitemap.xml — Bing Copilot relies on sitemaps for content discovery');
  }

  const ogCheck = meta?.checks.find(c => c.label.includes('Open Graph'));
  if (!ogCheck?.passed) {
    tips.push('Enable OG meta tags — Bing Copilot uses OG metadata for rich answers');
  }

  if (citability && citability.averageScore < 40) {
    tips.push('Improve content structure — Bing Copilot favors well-organized content with clear answers');
  }

  if (tips.length === 0) tips.push('Your site is well-optimized for Bing Copilot');

  return {
    platform: 'Bing Copilot',
    status: tips.length <= 1 ? 'good' : tips.length <= 3 ? 'needs-work' : 'critical',
    tips,
  };
}
