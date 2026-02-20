import { describe, it, expect, beforeEach, vi } from 'vitest';
import { copyRawMarkdown } from './raw-markdown';
import { readdirSync, statSync, copyFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import type { ResolvedAeoConfig } from '../types';

vi.mock('fs');
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args) => args.filter(Boolean).join('/')),
    relative: vi.fn((from, to) => to.replace(from + '/', '')),
    extname: vi.fn((file) => {
      const match = file.match(/\.[^.]+$/);
      return match ? match[0] : '';
    }),
    dirname: vi.fn((file) => {
      const parts = file.split('/');
      parts.pop();
      return parts.join('/');
    })
  };
});

describe('copyRawMarkdown', () => {
  const mockReaddirSync = vi.mocked(readdirSync);
  const mockStatSync = vi.mocked(statSync);
  const mockCopyFileSync = vi.mocked(copyFileSync);
  const mockMkdirSync = vi.mocked(mkdirSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createConfig = (overrides = {}): ResolvedAeoConfig => ({
    url: 'https://example.com',
    title: 'Test Site',
    description: 'Test description',
    contentDir: 'content',
    outDir: 'public/aeo',
    generators: {
      robotsTxt: true,
      llmsTxt: true,
      llmsFullTxt: true,
      rawMarkdown: true,
      manifest: true,
      sitemap: true,
      aiIndex: true,
    },
    ...overrides
  });

  it('should copy markdown files from source to public directory', () => {
    mockReaddirSync.mockReturnValue(['page1.md', 'page2.md', 'image.png', 'subfolder'] as any);
    
    mockStatSync.mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.endsWith('subfolder')) {
        return { isFile: () => false, isDirectory: () => true } as any;
      }
      return { isFile: () => true, isDirectory: () => false } as any;
    });

    const config = createConfig();
    const result = copyRawMarkdown(config);
    
    expect(mockCopyFileSync).toHaveBeenCalledTimes(2);
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      'content/page1.md',
      'public/aeo/page1.md'
    );
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      'content/page2.md',
      'public/aeo/page2.md'
    );
    expect(result).toHaveLength(2);
  });

  it('should recursively copy markdown files from subdirectories', () => {
    mockReaddirSync.mockImplementation((dirPath) => {
      const pathStr = dirPath.toString();
      if (pathStr === 'content') {
        return ['docs', 'root.md'] as any;
      } else if (pathStr.endsWith('docs')) {
        return ['guide.md', 'api'] as any;
      } else if (pathStr.endsWith('api')) {
        return ['reference.md'] as any;
      }
      return [];
    });
    
    mockStatSync.mockImplementation((path) => {
      const pathStr = path.toString();
      if (pathStr.includes('docs') && !pathStr.includes('.md')) {
        return { isFile: () => false, isDirectory: () => true } as any;
      }
      if (pathStr.includes('api') && !pathStr.includes('.md')) {
        return { isFile: () => false, isDirectory: () => true } as any;
      }
      return { isFile: () => true, isDirectory: () => false } as any;
    });

    const config = createConfig();
    const result = copyRawMarkdown(config);
    
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      'content/root.md',
      'public/aeo/root.md'
    );
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      'content/docs/guide.md',
      'public/aeo/docs/guide.md'
    );
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      'content/docs/api/reference.md',
      'public/aeo/docs/api/reference.md'
    );
    
    expect(mockMkdirSync).toHaveBeenCalledWith('public/aeo', expect.any(Object));
    expect(mockMkdirSync).toHaveBeenCalledWith('public/aeo/docs', expect.any(Object));
    expect(mockMkdirSync).toHaveBeenCalledWith('public/aeo/docs/api', expect.any(Object));
    expect(result).toHaveLength(3);
  });

  it('should skip non-markdown files', () => {
    mockReaddirSync.mockReturnValue(['document.md', 'script.js', 'style.css', 'data.json'] as any);
    
    mockStatSync.mockReturnValue({
      isFile: () => true,
      isDirectory: () => false
    } as any);

    const config = createConfig();
    const result = copyRawMarkdown(config);
    
    expect(mockCopyFileSync).toHaveBeenCalledTimes(1);
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      'content/document.md',
      'public/aeo/document.md'
    );
    expect(result).toHaveLength(1);
  });

  it('should handle missing markdown directory gracefully', () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error('ENOENT: Directory not found');
    });

    const config = createConfig();
    const result = copyRawMarkdown(config);
    
    expect(result).toEqual([]);
    expect(mockCopyFileSync).not.toHaveBeenCalled();
  });

  it('should use custom markdown directory from config', () => {
    mockReaddirSync.mockReturnValue(['test.md'] as any);
    
    mockStatSync.mockReturnValue({
      isFile: () => true,
      isDirectory: () => false
    } as any);

    const config = createConfig({ contentDir: 'custom-docs' });
    const result = copyRawMarkdown(config);
    
    expect(mockReaddirSync).toHaveBeenCalledWith('custom-docs');
    expect(mockCopyFileSync).toHaveBeenCalledWith(
      'custom-docs/test.md',
      'public/aeo/test.md'
    );
    expect(result).toHaveLength(1);
  });

  it('should handle copy errors for individual files', () => {
    mockReaddirSync.mockReturnValue(['file1.md', 'file2.md'] as any);
    
    mockStatSync.mockReturnValue({
      isFile: () => true,
      isDirectory: () => false
    } as any);
    
    mockCopyFileSync
      .mockImplementationOnce(() => { throw new Error('Permission denied'); })
      .mockImplementationOnce(() => undefined);

    const config = createConfig();
    const result = copyRawMarkdown(config);
    
    expect(mockCopyFileSync).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });
});