import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateManifest } from './manifest';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('./utils', () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    routes: [
      { path: '/', title: 'Home', description: 'Homepage', keywords: ['home', 'main'] },
      { path: '/about', title: 'About Us', description: 'Learn about our company' },
      { path: '/products', title: 'Products' },
      { path: '/contact', title: 'Contact', description: 'Get in touch', keywords: ['contact', 'email', 'phone'] }
    ],
    baseUrl: 'https://example.com',
    name: 'Example Site',
    description: 'An example website'
  }),
  ensureDir: vi.fn().mockResolvedValue(undefined)
}));

describe('generateManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate docs.json manifest with all routes', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateManifest('/test/project');
    
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join('/test/project', 'public', 'docs.json'),
      expect.any(String)
    );
    
    const manifest = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    
    expect(manifest).toHaveProperty('version', '1.0');
    expect(manifest).toHaveProperty('name', 'Example Site');
    expect(manifest).toHaveProperty('description', 'An example website');
    expect(manifest).toHaveProperty('baseUrl', 'https://example.com');
    expect(manifest).toHaveProperty('generated');
    expect(manifest.documents).toHaveLength(4);
  });

  it('should format document entries correctly', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateManifest('/test/project');
    
    const manifest = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    
    const homeDoc = manifest.documents[0];
    expect(homeDoc).toMatchObject({
      id: expect.stringMatching(/^[a-f0-9]{8}$/),
      url: 'https://example.com/',
      title: 'Home',
      description: 'Homepage',
      keywords: ['home', 'main']
    });
    
    const aboutDoc = manifest.documents[1];
    expect(aboutDoc).toMatchObject({
      id: expect.stringMatching(/^[a-f0-9]{8}$/),
      url: 'https://example.com/about',
      title: 'About Us',
      description: 'Learn about our company',
      keywords: []
    });
    
    const productsDoc = manifest.documents[2];
    expect(productsDoc).toMatchObject({
      id: expect.stringMatching(/^[a-f0-9]{8}$/),
      url: 'https://example.com/products',
      title: 'Products',
      description: '',
      keywords: []
    });
  });

  it('should generate unique IDs for each document', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateManifest('/test/project');
    
    const manifest = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    const ids = manifest.documents.map((doc: any) => doc.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should handle empty routes array', async () => {
    const { resolveConfig } = await import('./utils');
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      routes: [],
      baseUrl: 'https://example.com',
      name: 'Empty Site',
      description: 'A site with no pages'
    });
    
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateManifest('/test/project');
    
    const manifest = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(manifest.documents).toEqual([]);
  });

  it('should use defaults for missing config fields', async () => {
    const { resolveConfig } = await import('./utils');
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      routes: [{ path: '/', title: 'Home' }],
      baseUrl: 'https://example.com'
    });
    
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateManifest('/test/project');
    
    const manifest = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(manifest.name).toBe('');
    expect(manifest.description).toBe('');
  });

  it('should include timestamp in generated field', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    const beforeTime = new Date().toISOString();
    
    await generateManifest('/test/project');
    
    const manifest = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    const afterTime = new Date().toISOString();
    
    expect(manifest.generated).toBeDefined();
    expect(new Date(manifest.generated).toISOString()).toBeGreaterThanOrEqual(beforeTime);
    expect(new Date(manifest.generated).toISOString()).toBeLessThanOrEqual(afterTime);
  });
});