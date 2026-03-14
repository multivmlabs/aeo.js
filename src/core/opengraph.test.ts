import { describe, it, expect } from 'vitest';
import { generateOGTags, generateOGTagsHtml } from './opengraph';
import type { ResolvedAeoConfig, PageEntry } from '../types';

function makeConfig(overrides: Partial<ResolvedAeoConfig> = {}): ResolvedAeoConfig {
  return {
    title: 'Test Site',
    description: 'A test site',
    url: 'https://example.com',
    pages: [],
    outDir: './out',
    contentDir: '',
    generators: { robotsTxt: true, llmsTxt: true, llmsFullTxt: true, rawMarkdown: true, manifest: true, sitemap: true, aiIndex: true, schema: true },
    schema: {
      enabled: true,
      organization: { name: 'Test Org', url: 'https://example.com', logo: '', sameAs: [] },
      defaultType: 'WebPage',
    },
    og: {
      enabled: true,
      image: '',
      twitterHandle: '',
      type: 'website',
    },
    widget: { enabled: false, position: 'bottom-right', theme: 'auto', title: '', description: '' },
    ...overrides,
  } as ResolvedAeoConfig;
}

function makePage(overrides: Partial<PageEntry> = {}): PageEntry {
  return {
    pathname: '/about',
    title: 'About Us',
    description: 'Learn about us',
    ...overrides,
  };
}

describe('generateOGTags', () => {
  it('generates basic OG and Twitter tags', () => {
    const tags = generateOGTags(makePage(), makeConfig());
    const ogTitle = tags.find(t => t.property === 'og:title');
    const twTitle = tags.find(t => t.name === 'twitter:title');
    expect(ogTitle?.content).toBe('About Us');
    expect(twTitle?.content).toBe('About Us');
  });

  it('builds correct page URL for non-root pages', () => {
    const tags = generateOGTags(makePage({ pathname: '/docs/api' }), makeConfig());
    const ogUrl = tags.find(t => t.property === 'og:url');
    expect(ogUrl?.content).toBe('https://example.com/docs/api');
  });

  it('uses config.url for root page', () => {
    const tags = generateOGTags(makePage({ pathname: '/' }), makeConfig());
    const ogUrl = tags.find(t => t.property === 'og:url');
    expect(ogUrl?.content).toBe('https://example.com');
  });

  it('falls back to config title/description when page has none', () => {
    const tags = generateOGTags(makePage({ title: undefined, description: undefined }), makeConfig());
    const ogTitle = tags.find(t => t.property === 'og:title');
    expect(ogTitle?.content).toBe('Test Site');
  });

  it('includes OG image when configured', () => {
    const config = makeConfig({ og: { enabled: true, image: 'https://example.com/og.png', twitterHandle: '', type: 'website' } });
    const tags = generateOGTags(makePage(), config);
    const ogImage = tags.find(t => t.property === 'og:image');
    const twImage = tags.find(t => t.name === 'twitter:image');
    const twCard = tags.find(t => t.name === 'twitter:card');
    expect(ogImage?.content).toBe('https://example.com/og.png');
    expect(twImage?.content).toBe('https://example.com/og.png');
    expect(twCard?.content).toBe('summary_large_image');
  });

  it('uses summary card when no image', () => {
    const tags = generateOGTags(makePage(), makeConfig());
    const twCard = tags.find(t => t.name === 'twitter:card');
    expect(twCard?.content).toBe('summary');
  });

  it('includes twitter handle when configured', () => {
    const config = makeConfig({ og: { enabled: true, image: '', twitterHandle: '@testsite', type: 'website' } });
    const tags = generateOGTags(makePage(), config);
    const twSite = tags.find(t => t.name === 'twitter:site');
    expect(twSite?.content).toBe('@testsite');
  });
});

describe('generateOGTagsHtml', () => {
  it('generates valid HTML meta tags', () => {
    const html = generateOGTagsHtml(makePage(), makeConfig());
    expect(html).toContain('<meta property="og:title" content="About Us" />');
    expect(html).toContain('<meta name="twitter:title" content="About Us" />');
  });

  it('escapes special characters in content', () => {
    const page = makePage({ title: 'Test & "Quotes" <Tags>' });
    const html = generateOGTagsHtml(page, makeConfig());
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
  });
});
