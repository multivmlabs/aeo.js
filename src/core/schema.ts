import type { ResolvedAeoConfig, PageEntry } from '../types';
import { detectFaqPatterns, detectHowToSteps } from './schema-patterns';

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
export function generateSiteSchemas(config: ResolvedAeoConfig): object[] {
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

  // Detect HowTo patterns (only if no FAQ was detected)
  if (faqItems.length === 0) {
    const howToSteps = detectHowToSteps(page.content || '');
    if (howToSteps.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: page.title || config.title,
        step: howToSteps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      });
    }
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
 * Serialize a value to JSON safe for embedding inside HTML <script> tags.
 * Escapes characters that could break out of the script context.
 */
function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Generate a JSON-LD script tag string for injection into HTML.
 */
export function generateJsonLdScript(schemas: object[]): string {
  if (schemas.length === 0) return '';
  if (schemas.length === 1) {
    return `<script type="application/ld+json">${serializeJsonForHtml(schemas[0])}</script>`;
  }
  return schemas
    .map(s => `<script type="application/ld+json">${serializeJsonForHtml(s)}</script>`)
    .join('\n');
}
