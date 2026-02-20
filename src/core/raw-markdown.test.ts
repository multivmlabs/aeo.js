import { describe, it, expect, beforeEach, vi } from 'vitest';
import { copyRawMarkdown } from './raw-markdown';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/'))
  };
});

vi.mock('./utils', () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    routes: [],
    baseUrl: 'https://example.com',
    markdownDir: 'content'
  }),
  ensureDir: vi.fn().mockResolvedValue(undefined)
}));

describe('copyRawMarkdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should copy markdown files from source to public directory', async () => {
    const mockReaddir = vi.mocked(fs.readdir);
    const mockStat = vi.mocked(fs.stat);
    const mockCopyFile = vi.mocked(fs.copyFile);
    
    mockReaddir.mockResolvedValue([
      { name: 'page1.md', isFile: () => true, isDirectory: () => false },
      { name: 'page2.md', isFile: () => true, isDirectory: () => false },
      { name: 'image.png', isFile: () => true, isDirectory: () => false },
      { name: 'subfolder', isFile: () => false, isDirectory: () => true }
    ] as any);
    
    mockStat.mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false
    } as any);

    await copyRawMarkdown('/test/project');
    
    expect(mockCopyFile).toHaveBeenCalledTimes(2);
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/test/project/content/page1.md',
      '/test/project/public/raw-markdown/page1.md'
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/test/project/content/page2.md',
      '/test/project/public/raw-markdown/page2.md'
    );
  });

  it('should recursively copy markdown files from subdirectories', async () => {
    const mockReaddir = vi.mocked(fs.readdir);
    const mockStat = vi.mocked(fs.stat);
    const mockCopyFile = vi.mocked(fs.copyFile);
    const { ensureDir } = await import('./utils');
    
    mockReaddir.mockImplementation((dirPath) => {
      const pathStr = dirPath.toString();
      if (pathStr.endsWith('/content')) {
        return Promise.resolve([
          { name: 'docs', isFile: () => false, isDirectory: () => true },
          { name: 'root.md', isFile: () => true, isDirectory: () => false }
        ] as any);
      } else if (pathStr.endsWith('/docs')) {
        return Promise.resolve([
          { name: 'guide.md', isFile: () => true, isDirectory: () => false },
          { name: 'api', isFile: () => false, isDirectory: () => true }
        ] as any);
      } else if (pathStr.endsWith('/api')) {
        return Promise.resolve([
          { name: 'reference.md', isFile: () => true, isDirectory: () => false }
        ] as any);
      }
      return Promise.resolve([]);
    });
    
    mockStat.mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false
    } as any);

    await copyRawMarkdown('/test/project');
    
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/test/project/content/root.md',
      '/test/project/public/raw-markdown/root.md'
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/test/project/content/docs/guide.md',
      '/test/project/public/raw-markdown/docs/guide.md'
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/test/project/content/docs/api/reference.md',
      '/test/project/public/raw-markdown/docs/api/reference.md'
    );
    
    expect(ensureDir).toHaveBeenCalledWith('/test/project/public/raw-markdown/docs');
    expect(ensureDir).toHaveBeenCalledWith('/test/project/public/raw-markdown/docs/api');
  });

  it('should skip non-markdown files', async () => {
    const mockReaddir = vi.mocked(fs.readdir);
    const mockCopyFile = vi.mocked(fs.copyFile);
    
    mockReaddir.mockResolvedValue([
      { name: 'document.md', isFile: () => true, isDirectory: () => false },
      { name: 'script.js', isFile: () => true, isDirectory: () => false },
      { name: 'style.css', isFile: () => true, isDirectory: () => false },
      { name: 'README.MD', isFile: () => true, isDirectory: () => false },
      { name: 'data.json', isFile: () => true, isDirectory: () => false }
    ] as any);

    await copyRawMarkdown('/test/project');
    
    expect(mockCopyFile).toHaveBeenCalledTimes(2);
    expect(mockCopyFile).toHaveBeenCalledWith(
      expect.stringContaining('document.md'),
      expect.stringContaining('document.md')
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      expect.stringContaining('README.MD'),
      expect.stringContaining('README.MD')
    );
  });

  it('should handle missing markdown directory gracefully', async () => {
    const mockReaddir = vi.mocked(fs.readdir);
    
    mockReaddir.mockRejectedValue(new Error('ENOENT: Directory not found'));

    await expect(copyRawMarkdown('/test/project')).resolves.not.toThrow();
  });

  it('should use custom markdown directory from config', async () => {
    const { resolveConfig } = await import('./utils');
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      routes: [],
      baseUrl: 'https://example.com',
      markdownDir: 'custom-docs'
    });
    
    const mockReaddir = vi.mocked(fs.readdir);
    mockReaddir.mockResolvedValue([
      { name: 'test.md', isFile: () => true, isDirectory: () => false }
    ] as any);
    
    const mockCopyFile = vi.mocked(fs.copyFile);

    await copyRawMarkdown('/test/project');
    
    expect(mockReaddir).toHaveBeenCalledWith(
      '/test/project/custom-docs',
      expect.any(Object)
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/test/project/custom-docs/test.md',
      expect.any(String)
    );
  });

  it('should handle copy errors for individual files', async () => {
    const mockReaddir = vi.mocked(fs.readdir);
    const mockCopyFile = vi.mocked(fs.copyFile);
    
    mockReaddir.mockResolvedValue([
      { name: 'file1.md', isFile: () => true, isDirectory: () => false },
      { name: 'file2.md', isFile: () => true, isDirectory: () => false }
    ] as any);
    
    mockCopyFile
      .mockRejectedValueOnce(new Error('Permission denied'))
      .mockResolvedValueOnce(undefined);

    await copyRawMarkdown('/test/project');
    
    expect(mockCopyFile).toHaveBeenCalledTimes(2);
  });
});