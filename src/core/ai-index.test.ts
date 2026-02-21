import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAIIndex } from './ai-index';
import type { ResolvedAeoConfig } from '../types';

vi.mock('fs', () => ({
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue('# Test\n\nContent'),
  existsSync: vi.fn().mockReturnValue(false),
}));

const baseConfig: ResolvedAeoConfig = {
  url: 'https://example.com',
  title: 'Test Site',
  description: 'A test site',
  contentDir: '/project/content',
  outDir: 'public',
  pages: [
    { pathname: '/', title: 'Home', description: 'Homepage', content: 'Welcome to our site. We offer great products and services.' },
    { pathname: '/about', title: 'About', description: 'About us', content: 'Learn more about our company and team.' },
    { pathname: '/contact', title: 'Contact' },
  ],
  generators: {
    robotsTxt: true,
    llmsTxt: true,
    llmsFullTxt: true,
    rawMarkdown: true,
    manifest: true,
    sitemap: true,
    aiIndex: true,
  },
  robots: { allow: ['/'], disallow: [], crawlDelay: 0, sitemap: '' },
  widget: {
    enabled: true,
    position: 'bottom-right',
    theme: { background: '#000', text: '#fff', accent: '#eee', badge: '#4ADE80' },
    humanLabel: 'Human',
    aiLabel: 'AI',
    showBadge: true,
  },
};

describe('generateAIIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate valid JSON index', () => {
    const result = generateAIIndex(baseConfig);
    const index = JSON.parse(result);

    expect(index).toHaveProperty('version', '1.0');
    expect(index).toHaveProperty('generated');
    expect(index.site).toEqual({
      title: 'Test Site',
      description: 'A test site',
      url: 'https://example.com',
    });
    expect(index.entries.length).toBeGreaterThan(0);
  });

  it('should create entries with required fields', () => {
    const result = generateAIIndex(baseConfig);
    const index = JSON.parse(result);

    for (const entry of index.entries) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('url');
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('content');
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBe(16);
    }
  });

  it('should generate unique IDs for each entry', () => {
    const result = generateAIIndex(baseConfig);
    const index = JSON.parse(result);
    const ids = index.entries.map((e: any) => e.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should extract keywords from content', () => {
    const result = generateAIIndex(baseConfig);
    const index = JSON.parse(result);

    const homeEntry = index.entries.find((e: any) => e.url === 'https://example.com');
    expect(homeEntry?.keywords).toBeDefined();
    expect(Array.isArray(homeEntry?.keywords)).toBe(true);
  });

  it('should handle pages without content', () => {
    const result = generateAIIndex(baseConfig);
    const index = JSON.parse(result);

    const contactEntry = index.entries.find((e: any) => e.url.includes('/contact'));
    expect(contactEntry).toBeDefined();
    expect(contactEntry?.title).toBe('Contact');
  });

  it('should handle empty pages', () => {
    const config: ResolvedAeoConfig = { ...baseConfig, pages: [] };
    const result = generateAIIndex(config);
    const index = JSON.parse(result);

    expect(index.entries).toEqual([]);
    expect(index.metadata.totalEntries).toBe(0);
  });

  it('should include metadata with embedding recommendations', () => {
    const result = generateAIIndex(baseConfig);
    const index = JSON.parse(result);

    expect(index.metadata).toMatchObject({
      generator: 'aeo.js',
      generatorUrl: 'https://aeojs.org',
    });
    expect(index.metadata.embedding).toBeDefined();
  });
});
