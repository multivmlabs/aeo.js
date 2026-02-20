import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateSitemap } from './sitemap';
import fs from 'fs';
import path from 'path';
import type { ResolvedAeoConfig } from '../types';

vi.mock('fs');
vi.mock('path');

describe('generateSitemap', () => {
  const mockFs = fs as any;
  const mockPath = path as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));
    
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
    mockPath.relative.mockImplementation((from: string, to: string) => 
      to.replace(from + '/', '')
    );
    mockPath.extname.mockImplementation((file: string) => {
      if (file.endsWith('.md')) return '.md';
      if (file.endsWith('.mdx')) return '.mdx';
      if (file.endsWith('.html')) return '.html';
      return '';
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseConfig: ResolvedAeoConfig = {
    url: 'https://example.com',
    title: 'Test Site',
    description: 'Test description',
    contentDir: '/test/content',
    outDir: 'public',
    generators: {
      robotsTxt: true,
      llmsTxt: true,
      llmsFullTxt: true,
      rawMarkdown: true,
      manifest: true,
      sitemap: true,
      aiIndex: true,
    }
  };

  it('should generate sitemap.xml with all routes', () => {
    mockFs.readdirSync.mockReturnValue(['index.md', 'about.md', 'products.md', 'contact.md']);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    });
    
    const sitemap = generateSitemap(baseConfig);
    
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('</urlset>');
    
    expect(sitemap).toContain('<loc>https://example.com</loc>');
    expect(sitemap).toContain('<loc>https://example.com/about</loc>');
    expect(sitemap).toContain('<loc>https://example.com/products</loc>');
    expect(sitemap).toContain('<loc>https://example.com/contact</loc>');
  });

  it('should include priority when specified', () => {
    mockFs.readdirSync.mockReturnValue(['index.md', 'about.md']);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    });
    
    const sitemap = generateSitemap(baseConfig);
    
    expect(sitemap).toContain('<priority>0.8</priority>');
  });

  it('should use default priority when not specified', () => {
    mockFs.readdirSync.mockReturnValue(['products.md']);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    });
    
    const sitemap = generateSitemap(baseConfig);
    
    expect(sitemap).toContain('<priority>0.8</priority>');
  });

  it('should include lastmod with current date', () => {
    mockFs.readdirSync.mockReturnValue(['index.md']);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    });
    
    const sitemap = generateSitemap(baseConfig);
    
    expect(sitemap).toContain('<lastmod>2024-01-15</lastmod>');
  });

  it('should handle empty routes gracefully', () => {
    mockFs.readdirSync.mockReturnValue([]);
    
    const sitemap = generateSitemap(baseConfig);
    
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('</urlset>');
    expect(sitemap).toContain('<loc>https://example.com</loc>');
  });

  it('should escape special characters in URLs', () => {
    const configWithSpecialChars = {
      ...baseConfig,
      url: 'https://example.com/search?q=test&category=books'
    };
    
    mockFs.readdirSync.mockReturnValue(['product/<id>.md']);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    });
    
    const sitemap = generateSitemap(configWithSpecialChars);
    
    // URLs should be properly escaped in XML
    expect(sitemap).toMatch(/search\?q=test&amp;category=books/);
    expect(sitemap).toMatch(/product\/&lt;id&gt;/);
  });

  it('should format XML with proper indentation', () => {
    mockFs.readdirSync.mockReturnValue(['about.md', 'products.md']);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    });
    
    const sitemap = generateSitemap(baseConfig);
    const lines = sitemap.split('\n');
    
    expect(lines[0]).toBe('<?xml version="1.0" encoding="UTF-8"?>');
    expect(lines[1]).toBe('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(lines.some(line => line.startsWith('  <url>'))).toBe(true);
    expect(lines.some(line => line.startsWith('    <loc>'))).toBe(true);
  });

  it('should handle routes with trailing slashes correctly', () => {
    mockFs.readdirSync.mockReturnValue(['about/.md', 'products/.md']);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    });
    
    const sitemap = generateSitemap(baseConfig);
    
    expect(sitemap).toContain('<loc>https://example.com/about/</loc>');
    expect(sitemap).toContain('<loc>https://example.com/products/</loc>');
  });
  
  it('should handle subdirectories recursively', () => {
    const files = ['index.md', 'blog', 'docs'];
    
    mockFs.readdirSync.mockImplementation((dir: string) => {
      if (dir === '/test/content') return files;
      if (dir === '/test/content/blog') return ['post1.md', 'post2.md'];
      if (dir === '/test/content/docs') return ['guide.md', 'api'];
      if (dir === '/test/content/docs/api') return ['reference.md'];
      return [];
    });
    
    mockFs.statSync.mockImplementation((path: string) => {
      const isDir = path.includes('/blog') || path.includes('/docs') || path.includes('/api');
      return {
        isDirectory: () => isDir && !path.endsWith('.md'),
        isFile: () => path.endsWith('.md')
      };
    });
    
    const sitemap = generateSitemap(baseConfig);
    
    expect(sitemap).toContain('<loc>https://example.com/index</loc>');
    expect(sitemap).toContain('<loc>https://example.com/blog/post1</loc>');
    expect(sitemap).toContain('<loc>https://example.com/blog/post2</loc>');
    expect(sitemap).toContain('<loc>https://example.com/docs/guide</loc>');
    expect(sitemap).toContain('<loc>https://example.com/docs/api/reference</loc>');
  });
});