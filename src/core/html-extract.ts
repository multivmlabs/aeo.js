/**
 * Shared HTML-to-markdown extraction utilities.
 * Used by all framework plugins for content extraction from build output.
 */

/**
 * Extract text content from HTML and convert to markdown.
 * Removes scripts, styles, SVGs, and boilerplate (nav, header, footer).
 * Prefers <main> content when available.
 */
export function extractTextFromHtml(html: string): string {
  let text = html;
  // Remove scripts, styles, SVGs
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  // Extract from <main> if available, otherwise strip boilerplate
  const mainMatch = text.match(/<main[^>]*>([\s\S]*)<\/main>/i);
  if (mainMatch) {
    text = mainMatch[1];
  } else {
    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  }
  // Handle links wrapping block elements: flatten to inline link
  text = text.replace(/<a[^>]+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, url, inner) => {
    if (/<(?:h[1-6]|div|p|section)[^>]*>/i.test(inner)) {
      const cleanInner = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `\n[${cleanInner.slice(0, 120).trim()}](${url})\n`;
    }
    return `[${inner}](${url})`;
  });
  // Convert headings (h1 -> ## since # is the page title)
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n');
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n\n##### $1\n\n');
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n\n###### $1\n\n');
  // Convert remaining inline links
  text = text.replace(/<a[^>]+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  // Convert bold and italic
  text = text.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  text = text.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');
  // Convert list items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  // Convert blockquotes
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n\n> $1\n\n');
  // Convert hr and br
  text = text.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');
  text = text.replace(/<br[^>]*\/?>/gi, '\n');
  // Convert paragraphs
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  // Other block elements as newlines
  text = text.replace(/<\/?(?:div|section|article|header|main|aside|figure|figcaption|table|thead|tbody|tr|td|th|ul|ol|dl|dt|dd)[^>]*>/gi, '\n');
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&copy;/g, '(c)');
  // Strip emojis (including flags)
  text = text.replace(/[\u{1F1E0}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '');
  // Clean up lines
  text = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  // Clean whitespace inside markdown syntax
  text = text.replace(/\[[\s\n]+/g, '[').replace(/[\s\n]+\]/g, ']');
  text = text.replace(/(#{2,6})\s*\n+\s*/g, '$1 ');
  // Remove empty headings
  text = text.replace(/^#{2,6}\s*$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return safeTruncate(text.trim(), 8000);
}

/**
 * Truncate text to at most maxLen chars, cutting at the nearest whitespace
 * boundary so we never split mid-word, mid-entity, or mid-UTF-8 sequence.
 * Falls back to a hard cut only when no whitespace is found.
 */
function safeTruncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
  if (lastBreak > maxLen * 0.8) return slice.slice(0, lastBreak).trimEnd();
  return slice.trimEnd();
}

/**
 * Extract title from HTML <title> tag. Splits on | and takes the first part.
 */
export function extractTitle(html: string): string | undefined {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  if (!match) return undefined;
  return match[1]?.split('|')[0]?.trim() || match[1];
}

/**
 * Extract description from HTML <meta name="description"> tag.
 */
export function extractDescription(html: string): string | undefined {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  return match?.[1];
}

/**
 * Extract existing JSON-LD structured data from HTML.
 */
export function extractJsonLd(html: string): object[] {
  const schemas: object[] = [];
  const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      schemas.push(parsed);
    } catch { /* skip invalid JSON-LD */ }
  }
  return schemas;
}

function escapeYamlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Convert HTML page to a complete markdown document with YAML frontmatter.
 */
export function htmlToMarkdown(html: string, pagePath: string, config: { url: string }): string {
  const rawTitle = extractTitle(html);
  const description = extractDescription(html);
  const textContent = extractTextFromHtml(html);

  const pageUrl = pagePath === '/'
    ? config.url
    : `${config.url.replace(/\/$/, '')}${pagePath}`;

  const lines: string[] = [];

  // YAML frontmatter
  lines.push('---');
  if (rawTitle) lines.push(`title: "${escapeYamlString(rawTitle)}"`);
  if (description) lines.push(`description: "${escapeYamlString(description)}"`);
  lines.push(`url: ${pageUrl}`);
  lines.push(`source: ${pageUrl}`);
  lines.push(`generated_by: aeo.js`);
  lines.push('---', '');

  if (rawTitle) lines.push(`# ${rawTitle}`, '');
  if (description) lines.push(`${description}`, '');

  if (textContent) lines.push(textContent);

  return lines.join('\n');
}
