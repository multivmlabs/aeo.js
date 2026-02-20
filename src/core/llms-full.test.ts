import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateLlmsFull } from './llms-full';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('./utils', () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    routes: [
      { path: '/', title: 'Home' },
      { path: '/about', title: 'About' },
      { path: '/blog/post1', title: 'Blog Post 1' }
    ],
    baseUrl: 'https://example.com'
  }),
  ensureDir: vi.fn().mockResolvedValue(undefined)
}));

describe('generateLlmsFull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should concatenate all page content into llms-full.txt', async () => {
    const mockReadFile = vi.mocked(fs.readFile);
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    mockReadFile.mockImplementation((filePath) => {
      const pathStr = filePath.toString();
      if (pathStr.endsWith('/index.html')) {
        return Promise.resolve(Buffer.from(`
          <!DOCTYPE html>
          <html>
            <body>
              <h1>Welcome Home</h1>
              <p>This is the homepage.</p>
            </body>
          </html>
        `));
      } else if (pathStr.endsWith('/about.html')) {
        return Promise.resolve(Buffer.from(`
          <!DOCTYPE html>
          <html>
            <body>
              <h1>About Us</h1>
              <p>Learn more about our company.</p>
            </body>
          </html>
        `));
      } else if (pathStr.endsWith('/blog/post1.html')) {
        return Promise.resolve(Buffer.from(`
          <!DOCTYPE html>
          <html>
            <body>
              <article>
                <h1>First Blog Post</h1>
                <p>This is an interesting article.</p>
              </article>
            </body>
          </html>
        `));
      }
      return Promise.resolve(Buffer.from('<html></html>'));
    });

    await generateLlmsFull('/test/project');
    
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join('/test/project', 'public', 'llms-full.txt'),
      expect.any(String)
    );
    
    const content = mockWriteFile.mock.calls[0][1] as string;
    
    expect(content).toContain('# Full Content Export');
    expect(content).toContain('## Page: Home');
    expect(content).toContain('URL: https://example.com/');
    expect(content).toContain('Welcome Home');
    expect(content).toContain('This is the homepage');
    
    expect(content).toContain('## Page: About');
    expect(content).toContain('URL: https://example.com/about');
    expect(content).toContain('About Us');
    expect(content).toContain('Learn more about our company');
    
    expect(content).toContain('## Page: Blog Post 1');
    expect(content).toContain('URL: https://example.com/blog/post1');
    expect(content).toContain('First Blog Post');
    expect(content).toContain('This is an interesting article');
  });

  it('should handle missing HTML files gracefully', async () => {
    const mockReadFile = vi.mocked(fs.readFile);
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    mockReadFile.mockRejectedValue(new Error('ENOENT: File not found'));

    await generateLlmsFull('/test/project');
    
    expect(mockWriteFile).toHaveBeenCalled();
    const content = mockWriteFile.mock.calls[0][1] as string;
    
    expect(content).toContain('## Page: Home');
    expect(content).toContain('[Content not available]');
  });

  it('should strip scripts and styles from content', async () => {
    const mockReadFile = vi.mocked(fs.readFile);
    const mockWriteFile = vi.mocked(fs.writeFile);
    
    mockReadFile.mockResolvedValue(Buffer.from(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>body { color: red; }</style>
        </head>
        <body>
          <h1>Page Title</h1>
          <p>Visible content here.</p>
          <script>console.log('hidden');</script>
          <style>.hidden { display: none; }</style>
        </body>
      </html>
    `));

    await generateLlmsFull('/test/project');
    
    const content = mockWriteFile.mock.calls[0][1] as string;
    
    expect(content).toContain('Page Title');
    expect(content).toContain('Visible content here');
    expect(content).not.toContain('console.log');
    expect(content).not.toContain('color: red');
    expect(content).not.toContain('display: none');
  });

  it('should include separator between pages', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('<html><body>Content</body></html>'));

    await generateLlmsFull('/test/project');
    
    const content = mockWriteFile.mock.calls[0][1] as string;
    const separatorCount = (content.match(/---\n\n/g) || []).length;
    
    expect(separatorCount).toBeGreaterThan(0);
  });
});