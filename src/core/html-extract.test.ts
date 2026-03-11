import { describe, it, expect } from 'vitest';
import { extractTextFromHtml, extractTitle, extractDescription, extractJsonLd, htmlToMarkdown } from './html-extract';

describe('HTML extraction utilities', () => {
  describe('extractTextFromHtml', () => {
    it('should strip scripts, styles, and SVGs', () => {
      const html = '<div><script>alert(1)</script><style>.x{}</style><svg><path/></svg><p>Hello</p></div>';
      const text = extractTextFromHtml(html);
      expect(text).toContain('Hello');
      expect(text).not.toContain('alert');
      expect(text).not.toContain('.x{}');
      expect(text).not.toContain('path');
    });

    it('should prefer <main> content', () => {
      const html = '<nav>Nav</nav><main><p>Main content</p></main><footer>Footer</footer>';
      const text = extractTextFromHtml(html);
      expect(text).toContain('Main content');
      expect(text).not.toContain('Nav');
      expect(text).not.toContain('Footer');
    });

    it('should convert headings to markdown', () => {
      const html = '<main><h1>Title</h1><h2>Subtitle</h2><h3>Section</h3></main>';
      const text = extractTextFromHtml(html);
      expect(text).toContain('## Title');
      expect(text).toContain('## Subtitle');
      expect(text).toContain('### Section');
    });

    it('should convert links to markdown', () => {
      const html = '<main><a href="/about">About</a></main>';
      const text = extractTextFromHtml(html);
      expect(text).toContain('[About](/about)');
    });

    it('should convert bold and italic', () => {
      const html = '<main><strong>Bold</strong> and <em>italic</em></main>';
      const text = extractTextFromHtml(html);
      expect(text).toContain('**Bold**');
      expect(text).toContain('*italic*');
    });

    it('should convert list items', () => {
      const html = '<main><ul><li>Item 1</li><li>Item 2</li></ul></main>';
      const text = extractTextFromHtml(html);
      expect(text).toContain('- Item 1');
      expect(text).toContain('- Item 2');
    });

    it('should limit output to 8000 characters', () => {
      const html = '<main>' + '<p>x</p>'.repeat(5000) + '</main>';
      const text = extractTextFromHtml(html);
      expect(text.length).toBeLessThanOrEqual(8000);
    });
  });

  describe('extractTitle', () => {
    it('should extract title from HTML', () => {
      expect(extractTitle('<title>My Page | Site</title>')).toBe('My Page');
    });

    it('should return undefined for no title', () => {
      expect(extractTitle('<html><body></body></html>')).toBeUndefined();
    });
  });

  describe('extractDescription', () => {
    it('should extract meta description', () => {
      const html = '<meta name="description" content="A great page">';
      expect(extractDescription(html)).toBe('A great page');
    });

    it('should return undefined for no description', () => {
      expect(extractDescription('<html></html>')).toBeUndefined();
    });
  });

  describe('extractJsonLd', () => {
    it('should extract JSON-LD from script tags', () => {
      const html = '<script type="application/ld+json">{"@type":"WebSite","name":"Test"}</script>';
      const schemas = extractJsonLd(html);
      expect(schemas).toHaveLength(1);
      expect((schemas[0] as any)['@type']).toBe('WebSite');
    });

    it('should handle multiple JSON-LD blocks', () => {
      const html = '<script type="application/ld+json">{"@type":"A"}</script><script type="application/ld+json">{"@type":"B"}</script>';
      expect(extractJsonLd(html)).toHaveLength(2);
    });

    it('should skip invalid JSON', () => {
      const html = '<script type="application/ld+json">{invalid}</script>';
      expect(extractJsonLd(html)).toHaveLength(0);
    });
  });

  describe('htmlToMarkdown', () => {
    it('should generate markdown with frontmatter', () => {
      const html = '<html><head><title>My Page</title><meta name="description" content="A page"></head><body><main><p>Hello world</p></main></body></html>';
      const md = htmlToMarkdown(html, '/test', { url: 'https://example.com' });
      expect(md).toContain('---');
      expect(md).toContain('title: "My Page"');
      expect(md).toContain('description: "A page"');
      expect(md).toContain('url: https://example.com/test');
      expect(md).toContain('Hello world');
    });

    it('should use base URL for root path', () => {
      const html = '<html><head><title>Home</title></head><body><main><p>Hi</p></main></body></html>';
      const md = htmlToMarkdown(html, '/', { url: 'https://example.com' });
      expect(md).toContain('url: https://example.com');
    });
  });
});
