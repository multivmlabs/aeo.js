import type { PageEntry, ResolvedAeoConfig } from '../types';

export interface CitabilityDimension {
  name: string;
  score: number;    // 0-25
  maxScore: number; // 25
  details: string;
}

export interface ContentHint {
  type: 'error' | 'warning' | 'suggestion';
  message: string;
  line?: number;
}

export interface PageCitabilityResult {
  pathname: string;
  score: number;       // 0-100
  dimensions: CitabilityDimension[];
  hints: ContentHint[];
}

export interface SiteCitabilityResult {
  averageScore: number;
  pages: PageCitabilityResult[];
}

/**
 * Score a single page's AI citability (0-100).
 * Four dimensions, 25 points each:
 * 1. Answer Blocks — direct, self-contained answers
 * 2. Self-Containment — paragraphs make sense without context
 * 3. Statistical Density — numbers, facts, named entities
 * 4. Structure Quality — heading hierarchy, lists, summaries
 */
export function scorePageCitability(page: PageEntry): PageCitabilityResult {
  const content = page.content || '';
  const dimensions: CitabilityDimension[] = [];
  const hints: ContentHint[] = [];

  dimensions.push(scoreAnswerBlocks(content, hints));
  dimensions.push(scoreSelfContainment(content, hints));
  dimensions.push(scoreStatisticalDensity(content, hints));
  dimensions.push(scoreStructureQuality(content, hints));

  const score = dimensions.reduce((sum, d) => sum + d.score, 0);

  return {
    pathname: page.pathname,
    score,
    dimensions,
    hints,
  };
}

/**
 * Score all pages in a site config.
 */
export function scoreSiteCitability(config: ResolvedAeoConfig): SiteCitabilityResult {
  const pages = config.pages.map(p => scorePageCitability(p));
  const averageScore = pages.length > 0
    ? Math.round(pages.reduce((sum, p) => sum + p.score, 0) / pages.length)
    : 0;

  return { averageScore, pages };
}

/**
 * Dimension 1: Answer Blocks (0-25)
 * Checks for direct, self-contained answer paragraphs.
 * Good answers: start with a noun/subject, 20-200 words, contain a factual claim.
 */
function scoreAnswerBlocks(content: string, hints: ContentHint[]): CitabilityDimension {
  if (!content.trim()) {
    return { name: 'Answer Blocks', score: 0, maxScore: 25, details: 'No content' };
  }

  const paragraphs = splitParagraphs(content);
  let answerCount = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const words = para.text.split(/\s+/).length;

    // Skip headings and very short paragraphs
    if (para.text.startsWith('#') || words < 15) continue;

    // Good answer: starts with capital letter (not pronoun), 20-200 words
    const startsWithSubject = /^[A-Z][a-z]/.test(para.text) && !/^(This|That|These|Those|It|They|We|He|She|I)\b/.test(para.text);
    const goodLength = words >= 20 && words <= 200;

    if (startsWithSubject && goodLength) {
      answerCount++;
    }
  }

  // Score: up to 25 based on answer density
  const answerRatio = paragraphs.length > 0 ? answerCount / Math.max(paragraphs.filter(p => !p.text.startsWith('#')).length, 1) : 0;
  let score = 0;
  if (answerCount >= 3 && answerRatio >= 0.5) score = 25;
  else if (answerCount >= 2 && answerRatio >= 0.3) score = 20;
  else if (answerCount >= 1) score = 12;
  else score = 0;

  if (answerCount === 0) {
    hints.push({ type: 'warning', message: 'No direct answer paragraphs found — add self-contained factual paragraphs that start with a clear subject' });
  }

  // Flag long paragraphs
  for (const para of paragraphs) {
    const words = para.text.split(/\s+/).length;
    if (words > 200 && !para.text.startsWith('#')) {
      hints.push({ type: 'suggestion', message: `Paragraph at line ${para.line} is ${words} words — split for better AI extraction (aim for <200)`, line: para.line });
    }
  }

  return { name: 'Answer Blocks', score, maxScore: 25, details: `${answerCount} answer-quality paragraphs found` };
}

/**
 * Dimension 2: Self-Containment (0-25)
 * Penalizes paragraphs that depend on surrounding context.
 */
function scoreSelfContainment(content: string, hints: ContentHint[]): CitabilityDimension {
  if (!content.trim()) {
    return { name: 'Self-Containment', score: 0, maxScore: 25, details: 'No content' };
  }

  const paragraphs = splitParagraphs(content).filter(p => !p.text.startsWith('#') && p.text.split(/\s+/).length >= 10);
  if (paragraphs.length === 0) {
    return { name: 'Self-Containment', score: 5, maxScore: 25, details: 'No substantial paragraphs' };
  }

  // Context-dependent patterns
  const contextPatterns = [
    /^(As mentioned|As noted|As described|As shown|As stated|As discussed)\b/i,
    /^(However|Furthermore|Moreover|Additionally|In addition|Nevertheless)\b/,
    /\b(above|below|previously|the following|as follows|see also)\b/i,
    /^(This|That|These|Those|It) (is|was|are|were|has|have|will|can|should|means)\b/,
  ];

  let contextDependentCount = 0;
  for (const para of paragraphs) {
    const isContextDependent = contextPatterns.some(p => p.test(para.text));
    if (isContextDependent) {
      contextDependentCount++;
    }
  }

  const selfContainedRatio = 1 - (contextDependentCount / paragraphs.length);
  let score: number;
  if (selfContainedRatio >= 0.8) score = 25;
  else if (selfContainedRatio >= 0.6) score = 18;
  else if (selfContainedRatio >= 0.4) score = 12;
  else score = 5;

  if (contextDependentCount > 0) {
    hints.push({ type: 'suggestion', message: `${contextDependentCount} paragraph(s) depend on surrounding context — rephrase to be self-contained for better AI citation` });
  }

  return { name: 'Self-Containment', score, maxScore: 25, details: `${Math.round(selfContainedRatio * 100)}% of paragraphs are self-contained` };
}

/**
 * Dimension 3: Statistical Density (0-25)
 * Scores presence of numbers, percentages, dates, named entities.
 */
function scoreStatisticalDensity(content: string, hints: ContentHint[]): CitabilityDimension {
  if (!content.trim()) {
    return { name: 'Statistical Density', score: 0, maxScore: 25, details: 'No content' };
  }

  const patterns = {
    percentages: /\d+(\.\d+)?%/g,
    currencies: /\$[\d,.]+|\€[\d,.]+|£[\d,.]+/g,
    years: /\b(19|20)\d{2}\b/g,
    quantities: /\b\d+[\s,]*(million|billion|thousand|hundred|K|M|B)\b/gi,
    metrics: /\b\d+(\.\d+)?\s*(users|customers|downloads|visitors|employees|countries|cities|hours|minutes|seconds|pages|files|requests)\b/gi,
    comparisons: /\b\d+x\b|\b\d+(\.\d+)?%\s*(faster|slower|more|less|better|worse|increase|decrease|growth|reduction)\b/gi,
  };

  let totalMatches = 0;
  for (const [, pattern] of Object.entries(patterns)) {
    const matches = content.match(pattern);
    if (matches) totalMatches += matches.length;
  }

  const words = content.split(/\s+/).length;
  const density = words > 0 ? totalMatches / (words / 100) : 0; // matches per 100 words

  let score: number;
  if (density >= 3) score = 25;
  else if (density >= 1.5) score = 20;
  else if (density >= 0.5) score = 12;
  else if (totalMatches > 0) score = 6;
  else score = 0;

  if (totalMatches === 0) {
    hints.push({ type: 'suggestion', message: 'No statistics or factual claims found — AI favors content with concrete numbers, percentages, and dates' });
  }

  return { name: 'Statistical Density', score, maxScore: 25, details: `${totalMatches} statistical claims (${density.toFixed(1)} per 100 words)` };
}

/**
 * Dimension 4: Structure Quality (0-25)
 * Checks heading hierarchy, lists, short paragraphs, summary/TL;DR.
 */
function scoreStructureQuality(content: string, hints: ContentHint[]): CitabilityDimension {
  if (!content.trim()) {
    return { name: 'Structure Quality', score: 0, maxScore: 25, details: 'No content' };
  }

  let points = 0;
  const details: string[] = [];

  // Has headings (7 pts)
  const headingPattern = /^#{1,6}\s/m;
  const headings = content.match(/^#{1,6}\s.+$/gm) || [];
  if (headings.length > 0) {
    points += 7;
    details.push(`${headings.length} headings`);
  } else {
    hints.push({ type: 'warning', message: 'No headings found — add H1-H6 headings to structure content for AI extraction' });
  }

  // Has lists (6 pts)
  const listItems = content.match(/^[\s]*[-*+]\s.+$|^\d+\.\s.+$/gm) || [];
  if (listItems.length >= 3) {
    points += 6;
    details.push(`${listItems.length} list items`);
  } else if (listItems.length > 0) {
    points += 3;
    details.push(`${listItems.length} list items`);
  } else {
    hints.push({ type: 'suggestion', message: 'No lists found — use bullet or numbered lists for key information' });
  }

  // Reasonable paragraph lengths (6 pts)
  const paragraphs = splitParagraphs(content).filter(p => !p.text.startsWith('#') && p.text.split(/\s+/).length >= 10);
  const avgWords = paragraphs.length > 0
    ? paragraphs.reduce((sum, p) => sum + p.text.split(/\s+/).length, 0) / paragraphs.length
    : 0;
  if (avgWords > 0 && avgWords <= 167) {
    points += 6;
    details.push(`avg ${Math.round(avgWords)} words/paragraph`);
  } else if (avgWords > 0 && avgWords <= 250) {
    points += 3;
    details.push(`avg ${Math.round(avgWords)} words/paragraph (aim for <167)`);
  }

  // Has summary/TL;DR or intro paragraph (6 pts)
  const hasSummary = /^(#{1,3}\s*)?(summary|tl;?dr|overview|introduction|key takeaways|in brief)\s*$/im.test(content);
  const firstPara = paragraphs[0];
  const hasShortIntro = firstPara && firstPara.text.split(/\s+/).length <= 60;
  if (hasSummary) {
    points += 6;
    details.push('has summary section');
  } else if (hasShortIntro) {
    points += 3;
    details.push('has short intro');
  } else {
    hints.push({ type: 'suggestion', message: 'Add a summary or TL;DR section at the top — helps AI extract the key message' });
  }

  return { name: 'Structure Quality', score: Math.min(points, 25), maxScore: 25, details: details.join(', ') || 'minimal structure' };
}

/**
 * Split content into paragraphs with line numbers.
 */
function splitParagraphs(content: string): { text: string; line: number }[] {
  const lines = content.split('\n');
  const paragraphs: { text: string; line: number }[] = [];
  let currentText = '';
  let currentLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      if (currentText) {
        paragraphs.push({ text: currentText.trim(), line: currentLine });
        currentText = '';
      }
    } else {
      if (!currentText) currentLine = i + 1;
      currentText += (currentText ? ' ' : '') + line;
    }
  }
  if (currentText) {
    paragraphs.push({ text: currentText.trim(), line: currentLine });
  }

  return paragraphs;
}

/**
 * Format a page citability result as a human-readable string.
 */
export function formatPageCitability(result: PageCitabilityResult): string {
  const lines: string[] = [];

  lines.push(`Page: ${result.pathname} — Score: ${result.score}/100`);
  lines.push('─'.repeat(40));

  for (const dim of result.dimensions) {
    const bar = '█'.repeat(dim.score) + '░'.repeat(dim.maxScore - dim.score);
    lines.push(`  ${dim.name}: ${dim.score}/${dim.maxScore} ${bar}`);
    lines.push(`    ${dim.details}`);
  }

  if (result.hints.length > 0) {
    lines.push('');
    lines.push('  Hints:');
    for (const hint of result.hints) {
      const icon = hint.type === 'error' ? '!' : hint.type === 'warning' ? '~' : '*';
      const loc = hint.line ? ` (line ${hint.line})` : '';
      lines.push(`    ${icon} ${hint.message}${loc}`);
    }
  }

  return lines.join('\n');
}
