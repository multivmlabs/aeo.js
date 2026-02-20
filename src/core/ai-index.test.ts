import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateAiIndex } from './ai-index';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('./utils', () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    routes: [
      { path: '/', title: 'Home', description: 'Homepage' },
      { path: '/about', title: 'About', description: 'About us' },
      { path: '/contact', title: 'Contact' }
    ],
    baseUrl: 'https://example.com'
  }),
  ensureDir: vi.fn().mockResolvedValue(undefined)
}));

describe('generateAiIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate AI index with content extraction', async () => {
    const mockReadFile = vi.mocked(fs.readFile);
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    mockReadFile.mockImplementation((filePath) => {
      if (filePath.toString().endsWith('/public/index.html')) {
        return Promise.resolve(Buffer.from(`
          <!DOCTYPE html>
          <html>
            <head><title>Test Page</title></head>
            <body>
              <h1>Welcome</h1>
              <p>This is the homepage content.</p>
            </body>
          </html>
        `));
      }
      return Promise.resolve(Buffer.from('<html></html>'));
    });

    await generateAiIndex('/test/project');
    
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join('/test/project', 'public', 'ai-index.json'),
      expect.any(String)
    );
    
    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(writtenContent).toHaveProperty('version', '1.0.0');
    expect(writtenContent).toHaveProperty('generated');
    expect(writtenContent).toHaveProperty('baseUrl', 'https://example.com');
    expect(writtenContent.pages).toHaveLength(3);
    expect(writtenContent.pages[0]).toMatchObject({
      url: 'https://example.com/',
      title: 'Home',
      description: 'Homepage'
    });
  });

  it('should generate AI index without content when extraction fails', async () => {
    const mockReadFile = vi.mocked(fs.readFile);
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    mockReadFile.mockRejectedValue(new Error('File not found'));

    await generateAiIndex('/test/project');
    
    expect(mockWriteFile).toHaveBeenCalled();
    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    
    expect(writtenContent.pages[0]).toMatchObject({
      url: 'https://example.com/',
      title: 'Home',
      description: 'Homepage'
    });
    expect(writtenContent.pages[0].content).toBeUndefined();
  });

  it('should handle empty routes gracefully', async () => {
    const { resolveConfig } = await import('./utils');
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      routes: [],
      baseUrl: 'https://example.com'
    });
    
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    await generateAiIndex('/test/project');
    
    expect(mockWriteFile).toHaveBeenCalled();
    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(writtenContent.pages).toEqual([]);
  });

  it('should extract content from HTML correctly', async () => {
    const mockReadFile = vi.mocked(fs.readFile);
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    mockReadFile.mockResolvedValue(Buffer.from(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Page</title>
          <meta name="description" content="Learn about our products">
        </head>
        <body>
          <nav>Navigation links</nav>
          <main>
            <h1>Our Products</h1>
            <p>We offer amazing solutions.</p>
            <article>
              <h2>Product A</h2>
              <p>Description of Product A with features.</p>
            </article>
          </main>
          <footer>Footer content</footer>
        </body>
      </html>
    `));

    await generateAiIndex('/test/project');
    
    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    const page = writtenContent.pages[0];
    
    expect(page.content).toContain('Our Products');
    expect(page.content).toContain('amazing solutions');
    expect(page.content).toContain('Product A');
    expect(page.content).not.toContain('Navigation links');
    expect(page.content).not.toContain('Footer content');
  });
});