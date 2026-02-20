import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSitemap } from './sitemap';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('./utils', () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    routes: [
      { path: '/', title: 'Home', priority: 1.0 },
      { path: '/about', title: 'About', priority: 0.8 },
      { path: '/products', title: 'Products' },
      { path: '/contact', title: 'Contact', priority: 0.5 }
    ],
    baseUrl: 'https://example.com'
  }),
  ensureDir: vi.fn().mockResolvedValue(undefined)
}));

describe('generateSitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate sitemap.xml with all routes', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateSitemap('/test/project');
    
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join('/test/project', 'public', 'sitemap.xml'),
      expect.any(String)
    );
    
    const sitemap = mockWriteFile.mock.calls[0][1] as string;
    
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('</urlset>');
    
    expect(sitemap).toContain('<loc>https://example.com/</loc>');
    expect(sitemap).toContain('<loc>https://example.com/about</loc>');
    expect(sitemap).toContain('<loc>https://example.com/products</loc>');
    expect(sitemap).toContain('<loc>https://example.com/contact</loc>');
  });

  it('should include priority when specified', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateSitemap('/test/project');
    
    const sitemap = mockWriteFile.mock.calls[0][1] as string;
    
    expect(sitemap).toMatch(/<url>\s*<loc>https:\/\/example\.com\/<\/loc>\s*<lastmod>2024-01-15<\/lastmod>\s*<priority>1\.0<\/priority>\s*<\/url>/);
    expect(sitemap).toMatch(/<url>\s*<loc>https:\/\/example\.com\/about<\/loc>\s*<lastmod>2024-01-15<\/lastmod>\s*<priority>0\.8<\/priority>\s*<\/url>/);
    expect(sitemap).toMatch(/<url>\s*<loc>https:\/\/example\.com\/contact<\/loc>\s*<lastmod>2024-01-15<\/lastmod>\s*<priority>0\.5<\/priority>\s*<\/url>/);
  });

  it('should use default priority when not specified', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateSitemap('/test/project');
    
    const sitemap = mockWriteFile.mock.calls[0][1] as string;
    
    expect(sitemap).toMatch(/<url>\s*<loc>https:\/\/example\.com\/products<\/loc>\s*<lastmod>2024-01-15<\/lastmod>\s*<priority>0\.5<\/priority>\s*<\/url>/);
  });

  it('should include lastmod with current date', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateSitemap('/test/project');
    
    const sitemap = mockWriteFile.mock.calls[0][1] as string;
    
    expect(sitemap).toContain('<lastmod>2024-01-15</lastmod>');
  });

  it('should handle empty routes gracefully', async () => {
    const { resolveConfig } = await import('./utils');
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      routes: [],
      baseUrl: 'https://example.com'
    });
    
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateSitemap('/test/project');
    
    const sitemap = mockWriteFile.mock.calls[0][1] as string;
    
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('</urlset>');
    expect(sitemap).not.toContain('<url>');
  });

  it('should escape special characters in URLs', async () => {
    const { resolveConfig } = await import('./utils');
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      routes: [
        { path: '/search?q=test&category=books', title: 'Search' },
        { path: '/product/<id>', title: 'Product' }
      ],
      baseUrl: 'https://example.com'
    });
    
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateSitemap('/test/project');
    
    const sitemap = mockWriteFile.mock.calls[0][1] as string;
    
    expect(sitemap).toContain('<loc>https://example.com/search?q=test&amp;category=books</loc>');
    expect(sitemap).toContain('<loc>https://example.com/product/&lt;id&gt;</loc>');
  });

  it('should format XML with proper indentation', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateSitemap('/test/project');
    
    const sitemap = mockWriteFile.mock.calls[0][1] as string;
    const lines = sitemap.split('\n');
    
    expect(lines[0]).toBe('<?xml version="1.0" encoding="UTF-8"?>');
    expect(lines[1]).toBe('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(lines.some(line => line.startsWith('  <url>'))).toBe(true);
    expect(lines.some(line => line.startsWith('    <loc>'))).toBe(true);
    expect(lines[lines.length - 2]).toBe('</urlset>');
  });

  it('should handle routes with trailing slashes correctly', async () => {
    const { resolveConfig } = await import('./utils');
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      routes: [
        { path: '/about/', title: 'About' },
        { path: '/products/', title: 'Products' }
      ],
      baseUrl: 'https://example.com'
    });
    
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateSitemap('/test/project');
    
    const sitemap = mockWriteFile.mock.calls[0][1] as string;
    
    expect(sitemap).toContain('<loc>https://example.com/about/</loc>');
    expect(sitemap).toContain('<loc>https://example.com/products/</loc>');
  });
});