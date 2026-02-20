import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateAEOFiles } from './generate'
import * as generateWrapper from './generate-wrapper'
import * as detect from './detect'
import * as utils from './utils'
import * as robots from './robots'
import * as llmsTxt from './llms-txt'
import * as llmsFull from './llms-full'
import * as rawMarkdown from './raw-markdown'
import * as manifest from './manifest'
import * as sitemap from './sitemap'
import * as aiIndex from './ai-index'
import { mkdirSync, writeFileSync } from 'fs'

vi.mock('./detect')
vi.mock('./utils')
vi.mock('./robots')
vi.mock('./llms-txt')
vi.mock('./llms-full')
vi.mock('./raw-markdown')
vi.mock('./manifest')
vi.mock('./sitemap')
vi.mock('./ai-index')
vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  copyFileSync: vi.fn()
}))

describe('generateAEOFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    vi.mocked(utils.resolveConfig).mockReturnValue({
      output: 'public/aeo',
      baseUrl: 'https://example.com',
      include: ['**/*.md'],
      exclude: ['**/node_modules/**'],
      generateRobots: true,
      generateLLMs: true,
      generateManifest: true,
      generateSitemap: true,
      generateAIIndex: true,
      generateRawMarkdown: true,
      title: 'Test Site',
      description: 'Test Description',
      url: 'https://example.com',
      contentDir: 'content',
      outDir: 'public/aeo',
      generators: {
        robotsTxt: true,
        llmsTxt: true,
        llmsFullTxt: true,
        rawMarkdown: true,
        manifest: true,
        sitemap: true,
        aiIndex: true
      },
      widget: {
        enabled: true,
        position: 'bottom-right',
        theme: {
          background: 'rgba(18, 18, 24, 0.9)',
          text: '#C0C0C5',
          accent: '#E8E8EA',
          badge: '#4ADE80'
        },
        humanLabel: 'Human',
        aiLabel: 'AI',
        showBadge: true
      }
    })
    
    vi.mocked(utils.getAllMarkdownFiles).mockReturnValue([
      '/project/README.md',
      '/project/docs/guide.md'
    ])
    
    vi.mocked(detect.detectFramework).mockReturnValue({
      name: 'next',
      version: '13.0.0',
      configFile: 'next.config.js',
      contentDir: 'content',
      outDir: 'public'
    })

    // Mock generator functions to return sample content
    vi.mocked(robots.generateRobotsTxt).mockReturnValue('User-agent: *\nAllow: /')
    vi.mocked(llmsTxt.generateLlmsTxt).mockReturnValue('# LLMs.txt')
    vi.mocked(llmsFull.generateLlmsFullTxt).mockReturnValue('# Full LLMs')
    vi.mocked(manifest.generateManifest).mockReturnValue('{"docs":[]}')
    vi.mocked(sitemap.generateSitemap).mockReturnValue('<?xml version="1.0"?>')
    vi.mocked(aiIndex.generateAIIndex).mockReturnValue('{"index":[]}')
    vi.mocked(rawMarkdown.copyMarkdownFiles).mockReturnValue([])
  })

  it('should generate all AEO files when all options enabled', async () => {
    const config = {
      generateRobots: true,
      generateLLMs: true,
      generateManifest: true,
      generateSitemap: true,
      generateAIIndex: true,
      generateRawMarkdown: true
    }

    await generateAEOFiles('/project', config)

    // Check that files were written
    expect(mkdirSync).toHaveBeenCalled()
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('robots.txt'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('llms.txt'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('llms-full.txt'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('docs.json'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('sitemap.xml'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('ai-index.json'),
      expect.any(String),
      'utf-8'
    )
    expect(rawMarkdown.copyMarkdownFiles).toHaveBeenCalled()
  })

  it('should only generate specified files', async () => {
    const config = {
      generateRobots: true,
      generateLLMs: false,
      generateManifest: true,
      generateSitemap: false,
      generateAIIndex: false,
      generateRawMarkdown: false
    }

    vi.mocked(utils.resolveConfig).mockReturnValue({
      output: 'public/aeo',
      baseUrl: 'https://example.com',
      include: ['**/*.md'],
      exclude: ['**/node_modules/**'],
      generateRobots: false,
      generateLLMs: false,
      generateManifest: false,
      generateSitemap: false,
      generateAIIndex: false,
      generateRawMarkdown: false,
      title: 'Test Site',
      description: 'Test Description',
      url: 'https://example.com',
      contentDir: 'content',
      outDir: 'public/aeo',
      generators: {
        robotsTxt: false,
        llmsTxt: false,
        llmsFullTxt: false,
        rawMarkdown: false,
        manifest: false,
        sitemap: false,
        aiIndex: false
      },
      widget: {
        enabled: true,
        position: 'bottom-right',
        theme: {
          background: 'rgba(18, 18, 24, 0.9)',
          text: '#C0C0C5',
          accent: '#E8E8EA',
          badge: '#4ADE80'
        },
        humanLabel: 'Human',
        aiLabel: 'AI',
        showBadge: true
      }
    })

    await generateAEOFiles('/project', config)

    // Check that only specified files were generated
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('robots.txt'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining('llms.txt'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining('llms-full.txt'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('docs.json'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining('sitemap.xml'),
      expect.any(String),
      'utf-8'
    )
    expect(writeFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining('ai-index.json'),
      expect.any(String),
      'utf-8'
    )
    expect(rawMarkdown.copyMarkdownFiles).not.toHaveBeenCalled()
  })

  it('should use default project root when not specified', async () => {
    await generateAEOFiles()

    expect(utils.resolveConfig).toHaveBeenCalled()
    expect(utils.getAllMarkdownFiles).toHaveBeenCalledWith(
      process.cwd(),
      expect.any(Array),
      expect.any(Array)
    )
  })

  it('should pass detected framework to generators', async () => {
    await generateAEOFiles('/project')

    expect(detect.detectFramework).toHaveBeenCalledWith('/project')
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(utils.getAllMarkdownFiles).mockImplementation(() => {
      throw new Error('File system error')
    })

    await expect(generateAEOFiles('/project')).rejects.toThrow('File system error')
  })

  it('should return summary of generated files', async () => {
    const result = await generateAEOFiles('/project')

    expect(result).toEqual({
      markdownFiles: ['/project/README.md', '/project/docs/guide.md'],
      framework: {
        name: 'next',
        version: '13.0.0',
        configFile: 'next.config.js',
        contentDir: 'content',
        outDir: 'public'
      },
      totalFiles: 2,
      outputPath: 'public/aeo'
    })
  })

  it('should handle no markdown files found', async () => {
    vi.mocked(utils.getAllMarkdownFiles).mockReturnValue([])

    const result = await generateAEOFiles('/project')

    expect(result.totalFiles).toBe(0)
    expect(result.markdownFiles).toEqual([])
  })
})