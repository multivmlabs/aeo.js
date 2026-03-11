import type { ResolvedAeoConfig, PageEntry } from '../types';

export interface MetaTag {
  property?: string;
  name?: string;
  content: string;
}

/**
 * Generate Open Graph and Twitter Card meta tags for a page.
 */
export function generateOGTags(page: PageEntry, config: ResolvedAeoConfig): MetaTag[] {
  const tags: MetaTag[] = [];
  const pageUrl = page.pathname === '/'
    ? config.url
    : `${config.url.replace(/\/$/, '')}${page.pathname}`;
  const title = page.title || config.title;
  const description = page.description || config.description;

  // Open Graph
  tags.push({ property: 'og:type', content: config.og.type });
  tags.push({ property: 'og:title', content: title });
  if (description) tags.push({ property: 'og:description', content: description });
  tags.push({ property: 'og:url', content: pageUrl });
  tags.push({ property: 'og:site_name', content: config.title });
  if (config.og.image) tags.push({ property: 'og:image', content: config.og.image });

  // Twitter Card
  tags.push({ name: 'twitter:card', content: config.og.image ? 'summary_large_image' : 'summary' });
  tags.push({ name: 'twitter:title', content: title });
  if (description) tags.push({ name: 'twitter:description', content: description });
  if (config.og.twitterHandle) tags.push({ name: 'twitter:site', content: config.og.twitterHandle });
  if (config.og.image) tags.push({ name: 'twitter:image', content: config.og.image });

  return tags;
}

/**
 * Generate meta tag HTML strings for injection.
 */
export function generateOGTagsHtml(page: PageEntry, config: ResolvedAeoConfig): string {
  const tags = generateOGTags(page, config);
  return tags
    .map(tag => {
      if (tag.property) return `<meta property="${tag.property}" content="${escapeAttr(tag.content)}" />`;
      return `<meta name="${tag.name}" content="${escapeAttr(tag.content)}" />`;
    })
    .join('\n    ');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
