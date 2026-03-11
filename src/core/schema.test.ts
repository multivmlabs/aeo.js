import { describe, it, expect } from 'vitest';
import { generateSchemaObjects, generatePageSchemas, generateJsonLdScript } from './schema';
import { resolveConfig } from './utils';

describe('Schema.org generator', () => {
  const config = resolveConfig({
    title: 'Test Site',
    description: 'A test site',
    url: 'https://test.com',
    schema: {
      organization: {
        name: 'Test Org',
        sameAs: ['https://twitter.com/test', 'https://github.com/test'],
      },
    },
    pages: [
      { pathname: '/', title: 'Home', description: 'Welcome home' },
      { pathname: '/about', title: 'About', description: 'About us' },
      { pathname: '/products/widget', title: 'Widget', description: 'Our widget' },
    ],
  });

  it('should generate WebSite and Organization site schemas', () => {
    const output = generateSchemaObjects(config);
    expect(output.site).toHaveLength(2);

    const webSite = output.site[0] as any;
    expect(webSite['@type']).toBe('WebSite');
    expect(webSite.name).toBe('Test Site');
    expect(webSite.url).toBe('https://test.com');

    const org = output.site[1] as any;
    expect(org['@type']).toBe('Organization');
    expect(org.name).toBe('Test Org');
    expect(org.sameAs).toEqual(['https://twitter.com/test', 'https://github.com/test']);
  });

  it('should generate WebPage schema for each page', () => {
    const output = generateSchemaObjects(config);
    expect(output.pages['/']).toBeDefined();
    expect(output.pages['/about']).toBeDefined();

    const homeSchemas = output.pages['/'];
    const webPage = homeSchemas.find((s: any) => s['@type'] === 'WebPage') as any;
    expect(webPage).toBeDefined();
    expect(webPage.name).toBe('Home');
    expect(webPage.url).toBe('https://test.com');
  });

  it('should generate BreadcrumbList for nested pages', () => {
    const output = generateSchemaObjects(config);
    const productSchemas = output.pages['/products/widget'];
    const breadcrumb = productSchemas.find((s: any) => s['@type'] === 'BreadcrumbList') as any;
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement).toHaveLength(3);
    expect(breadcrumb.itemListElement[0].name).toBe('Home');
    expect(breadcrumb.itemListElement[1].name).toBe('Products');
    expect(breadcrumb.itemListElement[2].name).toBe('Widget');
  });

  it('should not generate BreadcrumbList for root page', () => {
    const output = generateSchemaObjects(config);
    const homeSchemas = output.pages['/'];
    const breadcrumb = homeSchemas.find((s: any) => s['@type'] === 'BreadcrumbList');
    expect(breadcrumb).toBeUndefined();
  });

  it('should generate Article schema when configured', () => {
    const articleConfig = resolveConfig({
      title: 'Blog',
      url: 'https://blog.com',
      schema: { defaultType: 'Article' },
      pages: [{ pathname: '/post', title: 'My Post', description: 'A post' }],
    });
    const schemas = generatePageSchemas(articleConfig.pages[0], articleConfig);
    const article = schemas.find((s: any) => s['@type'] === 'Article') as any;
    expect(article).toBeDefined();
    expect(article.headline).toBe('My Post');
    expect(article.author['@type']).toBe('Organization');
  });

  it('should detect FAQ patterns in content', () => {
    const faqConfig = resolveConfig({
      title: 'FAQ Site',
      url: 'https://faq.com',
      pages: [{
        pathname: '/faq',
        title: 'FAQ',
        content: '## What is aeo.js?\n\naeo.js is a library for answer engine optimization.\n\n## How does it work?\n\nIt generates structured files at build time.',
      }],
    });
    const schemas = generatePageSchemas(faqConfig.pages[0], faqConfig);
    const faq = schemas.find((s: any) => s['@type'] === 'FAQPage') as any;
    expect(faq).toBeDefined();
    expect(faq.mainEntity).toHaveLength(2);
    expect(faq.mainEntity[0].name).toBe('What is aeo.js?');
    expect(faq.mainEntity[0].acceptedAnswer.text).toContain('aeo.js is a library');
  });

  it('should generate valid JSON-LD script tags', () => {
    const schemas = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Test' }];
    const script = generateJsonLdScript(schemas);
    expect(script).toContain('<script type="application/ld+json">');
    expect(script).toContain('"@type":"WebSite"');
  });
});
