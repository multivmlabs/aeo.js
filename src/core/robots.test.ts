import { describe, it, expect } from 'vitest'
import { generateRobotsTxt } from './robots'
import type { ResolvedAeoConfig } from '../types'

describe('generateRobotsTxt', () => {
  const baseConfig: ResolvedAeoConfig = {
    url: 'https://example.com',
    title: 'Test Site',
    description: 'Test description',
    contentDir: 'content',
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
  }

  it('should generate robots.txt with AI crawler rules', () => {
    const result = generateRobotsTxt(baseConfig)
    
    expect(result).toContain('User-agent: GPTBot')
    expect(result).toContain('User-agent: ChatGPT-User')
    expect(result).toContain('User-agent: CCBot')
    expect(result).toContain('User-agent: Claude-Web')
    expect(result).toContain('User-agent: ClaudeBot')
    expect(result).toContain('Allow: /')
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  it('should include all AI crawlers', () => {
    const result = generateRobotsTxt(baseConfig)
    
    expect(result).toContain('User-agent: PerplexityBot')
    expect(result).toContain('User-agent: Google-Extended')
    expect(result).toContain('User-agent: Bingbot')
    expect(result).toContain('User-agent: DeepSeekBot')
    expect(result).toContain('User-agent: cohere-ai')
  })

  it('should include AEO file references', () => {
    const result = generateRobotsTxt(baseConfig)
    
    expect(result).toContain('# AEO (Answer Engine Optimization) files')
    expect(result).toContain('# https://example.com/llms.txt')
    expect(result).toContain('# https://example.com/llms-full.txt')
    expect(result).toContain('# https://example.com/docs.json')
    expect(result).toContain('# https://example.com/ai-index.json')
  })

  it('should handle missing url', () => {
    const config: ResolvedAeoConfig = {
      ...baseConfig,
      url: '',
    }
    
    const result = generateRobotsTxt(config)
    
    expect(result).not.toContain('Sitemap:')
    expect(result).toContain('# /llms.txt')
  })

  it('should include traditional search engines', () => {
    const result = generateRobotsTxt(baseConfig)
    
    expect(result).toContain('User-agent: Googlebot')
    expect(result).toContain('Allow: /')
    expect(result).toContain('User-agent: Bingbot')
    expect(result).toContain('Allow: /')
  })
})