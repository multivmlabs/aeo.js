import type { ResolvedAeoConfig, PageEntry } from '../types';

export interface SchemaOutput {
  site: object[];
  pages: Record<string, object[]>;
}

/**
 * Generate JSON-LD structured data for the entire site.
 * Returns site-level schemas (WebSite, Organization) and per-page schemas.
 */
export function generateSchema(config: ResolvedAeoConfig): string {
  const output = generateSchemaObjects(config);
  return JSON.stringify(output, null, 2);
}

/**
 * Generate schema objects without serialization (for injection into HTML).
 */
export function generateSchemaObjects(config: ResolvedAeoConfig): SchemaOutput {
  const siteSchemas = generateSiteSchemas(config);
  const pageSchemas: Record<string, object[]> = {};

  for (const page of config.pages) {
    const schemas = generatePageSchemas(page, config);
    if (schemas.length > 0) {
      pageSchemas[page.pathname] = schemas;
    }
  }

  return { site: siteSchemas, pages: pageSchemas };
}

/**
 * Generate site-level schemas: WebSite + Organization.
 */
function generateSiteSchemas(config: ResolvedAeoConfig): object[] {
  const schemas: object[] = [];

  // WebSite schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.title,
    description: config.description || undefined,
    url: config.url,
  });

  // Organization schema (if name or sameAs provided)
  const org = config.schema.organization;
  if (org.name || org.sameAs.length > 0) {
    const orgSchema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: org.name,
      url: org.url,
    };
    if (org.logo) orgSchema.logo = org.logo;
    if (org.sameAs.length > 0) orgSchema.sameAs = org.sameAs;
    schemas.push(orgSchema);
  }

  return schemas;
}

/**
 * Generate per-page schemas based on page content and config defaults.
 */
export function generatePageSchemas(page: PageEntry, config: ResolvedAeoConfig): object[] {
  const schemas: object[] = [];
  const pageUrl = page.pathname === '/'
    ? config.url
    : `${config.url.replace(/\/$/, '')}${page.pathname}`;

  // Detect FAQ patterns in content
  const faqItems = detectFaqPatterns(page.content || '');
  if (faqItems.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    });
  }

  // WebPage or Article schema
  const pageType = config.schema.defaultType;
  const pageSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': pageType,
    name: page.title || config.title,
    url: pageUrl,
  };
  if (page.description) pageSchema.description = page.description;
  if (pageType === 'Article') {
    pageSchema.headline = page.title || config.title;
    pageSchema.author = {
      '@type': 'Organization',
      name: config.schema.organization.name,
    };
  }
  schemas.push(pageSchema);

  // BreadcrumbList for non-root pages
  if (page.pathname !== '/') {
    const breadcrumbs = generateBreadcrumbs(page.pathname, config);
    if (breadcrumbs.length > 1) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      });
    }
  }

  return schemas;
}

/**
 * Generate breadcrumb items from a pathname.
 */
function generateBreadcrumbs(pathname: string, config: ResolvedAeoConfig): { name: string; url: string }[] {
  const baseUrl = config.url.replace(/\/$/, '');
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { name: string; url: string }[] = [
    { name: 'Home', url: baseUrl + '/' },
  ];

  let currentPath = '';
  for (const part of parts) {
    currentPath += '/' + part;
    crumbs.push({
      name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      url: baseUrl + currentPath,
    });
  }

  return crumbs;
}

/**
 * Detect FAQ-like patterns in markdown/text content.
 * Looks for: headings ending with "?" followed by paragraph text.
 */
function detectFaqPatterns(content: string): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];

  // Pattern: ## Question? \n\n Answer text
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headingMatch = line.match(/^#{1,6}\s+(.+\?)\s*$/);
    if (headingMatch) {
      // Collect answer: all non-empty, non-heading lines following
      const answerLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
          if (answerLines.length > 0) break; // empty line after content = end
          continue; // skip leading empty lines
        }
        if (/^#{1,6}\s/.test(nextLine)) break; // next heading = end
        answerLines.push(nextLine);
      }
      if (answerLines.length > 0) {
        items.push({
          question: headingMatch[1],
          answer: answerLines.join(' ').slice(0, 500),
        });
      }
    }
  }

  return items;
}

/**
 * Generate a JSON-LD script tag string for injection into HTML.
 */
export function generateJsonLdScript(schemas: object[]): string {
  if (schemas.length === 0) return '';
  if (schemas.length === 1) {
    return `<script type="application/ld+json">${JSON.stringify(schemas[0])}</script>`;
  }
  return schemas
    .map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');
}
