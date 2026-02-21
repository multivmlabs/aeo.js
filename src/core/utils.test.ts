import { describe, it, expect, vi } from 'vitest';
import {
  resolveConfig,
  parseFrontmatter,
  bumpHeadings,
  extractTitle,
} from './utils';

vi.mock('./detect', () => ({
  detectFramework: vi.fn().mockReturnValue({
    framework: 'unknown',
    contentDir: 'src',
    outDir: 'dist',
  }),
}));

describe('utils', () => {
  describe('resolveConfig', () => {
    it('should return default config when no user config provided', () => {
      const result = resolveConfig();

      expect(result.title).toBe('My Site');
      expect(result.description).toBe('');
      expect(result.url).toBe('https://example.com');
      expect(result.generators.robotsTxt).toBe(true);
      expect(result.generators.llmsTxt).toBe(true);
      expect(result.widget.enabled).toBe(true);
      expect(result.widget.position).toBe('bottom-right');
    });

    it('should merge user config with defaults', () => {
      const result = resolveConfig({
        title: 'Custom Title',
        url: 'https://custom.com',
        generators: { sitemap: false },
      });

      expect(result.title).toBe('Custom Title');
      expect(result.url).toBe('https://custom.com');
      expect(result.generators.sitemap).toBe(false);
      expect(result.generators.robotsTxt).toBe(true);
    });

    it('should handle partial widget config', () => {
      const result = resolveConfig({
        widget: {
          position: 'top-left',
          theme: { accent: '#FF0000' },
        },
      });

      expect(result.widget.position).toBe('top-left');
      expect(result.widget.theme.accent).toBe('#FF0000');
      expect(result.widget.theme.background).toBe('rgba(18, 18, 24, 0.9)');
    });

    it('should resolve robots config', () => {
      const result = resolveConfig({
        robots: { disallow: ['/admin'], crawlDelay: 5 },
      });

      expect(result.robots.disallow).toEqual(['/admin']);
      expect(result.robots.crawlDelay).toBe(5);
      expect(result.robots.allow).toEqual(['/']);
    });
  });

  describe('parseFrontmatter', () => {
    it('should extract frontmatter from markdown', () => {
      const input = '---\ntitle: My Title\ndescription: My Desc\n---\n# Content';
      const result = parseFrontmatter(input);

      expect(result.frontmatter.title).toBe('My Title');
      expect(result.frontmatter.description).toBe('My Desc');
      expect(result.content).toContain('# Content');
    });

    it('should return empty frontmatter when none exists', () => {
      const input = '# Just Content\nNo frontmatter here';
      const result = parseFrontmatter(input);

      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe(input);
    });

    it('should handle quoted values', () => {
      const input = '---\ntitle: "Quoted Title"\n---\nContent';
      const result = parseFrontmatter(input);

      expect(result.frontmatter.title).toBe('Quoted Title');
    });
  });

  describe('bumpHeadings', () => {
    it('should increase heading levels by specified amount', () => {
      const input = '# H1\n## H2\n### H3';
      const result = bumpHeadings(input, 1);

      expect(result).toContain('## H1');
      expect(result).toContain('### H2');
      expect(result).toContain('#### H3');
    });

    it('should cap at h6', () => {
      const input = '###### H6';
      const result = bumpHeadings(input, 1);

      expect(result).toContain('###### H6');
    });
  });

  describe('extractTitle', () => {
    it('should extract h1 title', () => {
      expect(extractTitle('# My Title\nContent')).toBe('My Title');
    });

    it('should fall back to h2', () => {
      expect(extractTitle('## Sub Title\nContent')).toBe('Sub Title');
    });

    it('should fall back to first line', () => {
      expect(extractTitle('Some text\nMore text')).toBe('Some text');
    });
  });
});
