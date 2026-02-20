import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  resolveConfig, 
  getAllMarkdownFiles, 
  getProjectStructure,
  generateHash,
  ensureDirectoryExists 
} from './utils'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

vi.mock('fs')
vi.mock('path')
vi.mock('crypto')

describe('utils', () => {
  const mockFs = fs as any
  const mockPath = path as any
  const mockCrypto = crypto as any

  beforeEach(() => {
    vi.clearAllMocks()
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'))
    mockPath.resolve.mockImplementation((p: string) => `/absolute${p}`)
    mockPath.relative.mockImplementation((from: string, to: string) => to.replace(from, ''))
    mockPath.dirname.mockImplementation((p: string) => {
      const parts = p.split('/')
      parts.pop()
      return parts.join('/')
    })
  })

  describe('resolveConfig', () => {
    it('should merge default config with user config', () => {
      const userConfig = {
        output: 'custom-output',
        baseUrl: 'https://custom.com',
        include: ['*.mdx']
      }

      const result = resolveConfig(userConfig)
      
      expect(result.output).toBe('custom-output')
      expect(result.baseUrl).toBe('https://custom.com')
      expect(result.include).toContain('*.mdx')
      expect(result.include).toContain('**/*.md')
      expect(result.exclude).toContain('**/node_modules/**')
    })

    it('should use default config when no user config provided', () => {
      const result = resolveConfig()
      
      expect(result.output).toBe('public/aeo')
      expect(result.baseUrl).toBe('')
      expect(result.include).toEqual(['**/*.md', '**/*.mdx'])
      expect(result.exclude).toContain('**/node_modules/**')
    })

    it('should handle partial user config', () => {
      const userConfig = {
        baseUrl: 'https://example.com'
      }

      const result = resolveConfig(userConfig)
      
      expect(result.output).toBe('public/aeo')
      expect(result.baseUrl).toBe('https://example.com')
    })
  })

  describe('getAllMarkdownFiles', () => {
    it('should find all markdown files matching patterns', () => {
      mockFs.readdirSync.mockReturnValue(['file1.md', 'file2.mdx', 'file3.txt'])
      mockFs.statSync.mockImplementation((path: string) => ({
        isDirectory: () => path.includes('subdir'),
        isFile: () => !path.includes('subdir')
      }))
      mockFs.existsSync.mockReturnValue(true)

      const files = getAllMarkdownFiles('/root', ['*.md', '*.mdx'], [])
      
      expect(files.length).toBeGreaterThan(0)
    })

    it('should exclude files matching exclude patterns', () => {
      mockFs.readdirSync.mockReturnValue(['file1.md', 'node_modules', 'file2.md'])
      mockFs.statSync.mockImplementation((path: string) => ({
        isDirectory: () => path.includes('node_modules'),
        isFile: () => !path.includes('node_modules')
      }))

      const files = getAllMarkdownFiles('/root', ['**/*.md'], ['**/node_modules/**'])
      
      expect(files.every(f => !f.includes('node_modules'))).toBe(true)
    })
  })

  describe('getProjectStructure', () => {
    it('should generate project structure tree', () => {
      mockFs.readdirSync.mockImplementation((dir: string) => {
        if (dir === '/root') return ['src', 'package.json']
        if (dir.includes('src')) return ['index.js', 'utils.js']
        return []
      })
      mockFs.statSync.mockImplementation((path: string) => ({
        isDirectory: () => path.includes('src') && !path.includes('.'),
        isFile: () => path.includes('.')
      }))

      const structure = getProjectStructure('/root')
      
      expect(structure).toContain('src/')
      expect(structure).toContain('package.json')
    })

    it('should respect max depth limit', () => {
      mockFs.readdirSync.mockReturnValue(['deep'])
      mockFs.statSync.mockReturnValue({ isDirectory: () => true, isFile: () => false })

      const structure = getProjectStructure('/root', 2)
      const lines = structure.split('\n')
      
      expect(lines.length).toBeLessThanOrEqual(10)
    })
  })

  describe('generateHash', () => {
    it('should generate consistent hash for same content', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('abc123')
      }
      mockCrypto.createHash.mockReturnValue(mockHash)

      const hash1 = generateHash('test content')
      const hash2 = generateHash('test content')
      
      expect(hash1).toBe(hash2)
      expect(hash1).toBe('abc123')
    })

    it('should generate different hash for different content', () => {
      let callCount = 0
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn(() => `hash${++callCount}`)
      }
      mockCrypto.createHash.mockReturnValue(mockHash)

      const hash1 = generateHash('content1')
      const hash2 = generateHash('content2')
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false)
      mockFs.mkdirSync.mockReturnValue(undefined)

      ensureDirectoryExists('/new/path')
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/new/path', { recursive: true })
    })

    it('should not create directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true)

      ensureDirectoryExists('/existing/path')
      
      expect(mockFs.mkdirSync).not.toHaveBeenCalled()
    })
  })
})