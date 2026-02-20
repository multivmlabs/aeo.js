import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateAllWrapper } from './generate-wrapper';

// Mock all generator functions
vi.mock('./robots', () => ({
  generateRobots: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./sitemap', () => ({
  generateSitemap: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./llms-txt', () => ({
  generateLlmsTxt: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./llms-full', () => ({
  generateLlmsFull: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./manifest', () => ({
  generateManifest: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./ai-index', () => ({
  generateAiIndex: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./raw-markdown', () => ({
  copyRawMarkdown: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('./utils', () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    routes: [{ path: '/', title: 'Home' }],
    baseUrl: 'https://example.com',
    generators: {
      robots: true,
      sitemap: true,
      llmsTxt: true,
      llmsFull: true,
      manifest: true,
      aiIndex: true,
      rawMarkdown: true
    }
  })
}));

describe('generateAllWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call all enabled generators', async () => {
    const { generateRobots } = await import('./robots');
    const { generateSitemap } = await import('./sitemap');
    const { generateLlmsTxt } = await import('./llms-txt');
    const { generateLlmsFull } = await import('./llms-full');
    const { generateManifest } = await import('./manifest');
    const { generateAiIndex } = await import('./ai-index');
    const { copyRawMarkdown } = await import('./raw-markdown');

    await generateAllWrapper('/test/project');

    expect(generateRobots).toHaveBeenCalledWith('/test/project');
    expect(generateSitemap).toHaveBeenCalledWith('/test/project');
    expect(generateLlmsTxt).toHaveBeenCalledWith('/test/project');
    expect(generateLlmsFull).toHaveBeenCalledWith('/test/project');
    expect(generateManifest).toHaveBeenCalledWith('/test/project');
    expect(generateAiIndex).toHaveBeenCalledWith('/test/project');
    expect(copyRawMarkdown).toHaveBeenCalledWith('/test/project');
  });

  it('should skip disabled generators', async () => {
    const { resolveConfig } = await import('./utils');
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      routes: [],
      baseUrl: 'https://example.com',
      generators: {
        robots: true,
        sitemap: false,
        llmsTxt: true,
        llmsFull: false,
        manifest: true,
        aiIndex: false,
        rawMarkdown: false
      }
    });

    const { generateRobots } = await import('./robots');
    const { generateSitemap } = await import('./sitemap');
    const { generateLlmsTxt } = await import('./llms-txt');
    const { generateLlmsFull } = await import('./llms-full');
    const { generateManifest } = await import('./manifest');
    const { generateAiIndex } = await import('./ai-index');
    const { copyRawMarkdown } = await import('./raw-markdown');

    await generateAllWrapper('/test/project');

    expect(generateRobots).toHaveBeenCalled();
    expect(generateSitemap).not.toHaveBeenCalled();
    expect(generateLlmsTxt).toHaveBeenCalled();
    expect(generateLlmsFull).not.toHaveBeenCalled();
    expect(generateManifest).toHaveBeenCalled();
    expect(generateAiIndex).not.toHaveBeenCalled();
    expect(copyRawMarkdown).not.toHaveBeenCalled();
  });

  it('should handle generator errors gracefully', async () => {
    const { generateRobots } = await import('./robots');
    const { generateSitemap } = await import('./sitemap');
    const { generateLlmsTxt } = await import('./llms-txt');
    
    vi.mocked(generateRobots).mockRejectedValueOnce(new Error('Robots generation failed'));
    vi.mocked(generateSitemap).mockResolvedValueOnce(undefined);
    
    await generateAllWrapper('/test/project');

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error generating robots.txt:'),
      expect.any(Error)
    );
    expect(generateSitemap).toHaveBeenCalled();
    expect(generateLlmsTxt).toHaveBeenCalled();
  });

  it('should log progress for each generator', async () => {
    await generateAllWrapper('/test/project');

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Generating robots.txt'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Generating sitemap.xml'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Generating llms.txt'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Generating llms-full.txt'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Generating docs.json'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Generating ai-index.json'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Copying raw markdown'));
  });

  it('should complete even if all generators fail', async () => {
    const { generateRobots } = await import('./robots');
    const { generateSitemap } = await import('./sitemap');
    const { generateLlmsTxt } = await import('./llms-txt');
    const { generateLlmsFull } = await import('./llms-full');
    const { generateManifest } = await import('./manifest');
    const { generateAiIndex } = await import('./ai-index');
    const { copyRawMarkdown } = await import('./raw-markdown');

    const error = new Error('Generator failed');
    vi.mocked(generateRobots).mockRejectedValue(error);
    vi.mocked(generateSitemap).mockRejectedValue(error);
    vi.mocked(generateLlmsTxt).mockRejectedValue(error);
    vi.mocked(generateLlmsFull).mockRejectedValue(error);
    vi.mocked(generateManifest).mockRejectedValue(error);
    vi.mocked(generateAiIndex).mockRejectedValue(error);
    vi.mocked(copyRawMarkdown).mockRejectedValue(error);

    await expect(generateAllWrapper('/test/project')).resolves.not.toThrow();
    
    expect(console.error).toHaveBeenCalledTimes(7);
  });

  it('should use default config when generators not specified', async () => {
    const { resolveConfig } = await import('./utils');
    vi.mocked(resolveConfig).mockResolvedValueOnce({
      routes: [],
      baseUrl: 'https://example.com'
    });

    const { generateRobots } = await import('./robots');
    const { generateSitemap } = await import('./sitemap');
    
    await generateAllWrapper('/test/project');

    // Should call all generators by default
    expect(generateRobots).toHaveBeenCalled();
    expect(generateSitemap).toHaveBeenCalled();
  });

  it('should pass correct project root to each generator', async () => {
    const projectRoot = '/my/custom/project';
    
    const { generateRobots } = await import('./robots');
    const { generateSitemap } = await import('./sitemap');
    const { generateLlmsTxt } = await import('./llms-txt');

    await generateAllWrapper(projectRoot);

    expect(generateRobots).toHaveBeenCalledWith(projectRoot);
    expect(generateSitemap).toHaveBeenCalledWith(projectRoot);
    expect(generateLlmsTxt).toHaveBeenCalledWith(projectRoot);
  });
});