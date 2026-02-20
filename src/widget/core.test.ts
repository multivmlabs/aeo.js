import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AEOWidget } from './core'

describe('AEOWidget', () => {
  let widget: AEOWidget
  let container: HTMLDivElement

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.id = 'test-container'
    document.body.appendChild(container)
    
    global.fetch = vi.fn()
  })

  afterEach(() => {
    if (widget) {
      widget.destroy()
    }
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should create widget with default options', () => {
      widget = new AEOWidget()
      
      expect(widget).toBeDefined()
      expect(document.querySelector('.aeo-widget')).toBeDefined()
    })

    it('should apply custom theme', () => {
      widget = new AEOWidget({
        theme: 'light'
      })
      
      const widgetEl = document.querySelector('.aeo-widget')
      expect(widgetEl?.getAttribute('data-theme')).toBe('light')
    })

    it('should position widget correctly', () => {
      widget = new AEOWidget({
        position: 'top-right'
      })
      
      const widgetEl = document.querySelector('.aeo-widget') as HTMLElement
      expect(widgetEl?.style.top).toBeDefined()
      expect(widgetEl?.style.right).toBeDefined()
    })

    it('should start expanded if specified', () => {
      widget = new AEOWidget({
        startExpanded: true
      })
      
      const content = document.querySelector('.aeo-widget-content') as HTMLElement
      expect(content?.style.display).not.toBe('none')
    })
  })

  describe('data loading', () => {
    it('should fetch llms.txt by default', async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('# Test Content')
      }
      
      ;(global.fetch as any).mockResolvedValue(mockResponse)
      
      widget = new AEOWidget()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(global.fetch).toHaveBeenCalledWith('/aeo/llms.txt')
    })

    it('should fetch from custom endpoint', async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('Custom content')
      }
      
      ;(global.fetch as any).mockResolvedValue(mockResponse)
      
      widget = new AEOWidget({
        endpoint: 'https://api.example.com/aeo'
      })
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/aeo')
    })

    it('should handle fetch errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))
      
      widget = new AEOWidget()
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const content = document.querySelector('.aeo-widget-content')
      expect(content?.textContent).toContain('Error')
    })

    it('should use fallback extractor when fetch fails', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))
      
      document.body.innerHTML = `
        <h1>Page Title</h1>
        <p>Some content</p>
      `
      
      widget = new AEOWidget({
        useFallback: true
      })
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const content = document.querySelector('.aeo-widget-content')
      expect(content?.textContent).toContain('Page Title')
    })
  })

  describe('user interactions', () => {
    it('should toggle expansion on button click', () => {
      widget = new AEOWidget()
      
      const button = document.querySelector('.aeo-widget-toggle') as HTMLButtonElement
      const content = document.querySelector('.aeo-widget-content') as HTMLElement
      
      expect(content.style.display).toBe('none')
      
      button.click()
      expect(content.style.display).toBe('block')
      
      button.click()
      expect(content.style.display).toBe('none')
    })

    it('should copy content to clipboard', async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
      Object.assign(navigator, {
        clipboard: mockClipboard
      })
      
      widget = new AEOWidget()
      widget['content'] = 'Test content to copy'
      
      const copyButton = document.querySelector('.aeo-widget-copy') as HTMLButtonElement
      copyButton.click()
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Test content to copy')
    })

    it('should call onToggle callback', () => {
      const onToggle = vi.fn()
      widget = new AEOWidget({
        onToggle
      })
      
      const button = document.querySelector('.aeo-widget-toggle') as HTMLButtonElement
      button.click()
      
      expect(onToggle).toHaveBeenCalledWith(true)
      
      button.click()
      expect(onToggle).toHaveBeenCalledWith(false)
    })
  })

  describe('styling', () => {
    it('should inject styles into head', () => {
      widget = new AEOWidget()
      
      const styles = document.querySelector('style[data-aeo-widget]')
      expect(styles).toBeDefined()
      expect(styles?.textContent).toContain('.aeo-widget')
    })

    it('should apply custom colors', () => {
      widget = new AEOWidget({
        primaryColor: '#FF0000',
        backgroundColor: '#00FF00'
      })
      
      const widgetEl = document.querySelector('.aeo-widget') as HTMLElement
      expect(widgetEl?.style.getPropertyValue('--aeo-primary')).toBe('#FF0000')
      expect(widgetEl?.style.getPropertyValue('--aeo-background')).toBe('#00FF00')
    })
  })

  describe('destroy', () => {
    it('should remove widget from DOM', () => {
      widget = new AEOWidget()
      
      expect(document.querySelector('.aeo-widget')).toBeDefined()
      
      widget.destroy()
      
      expect(document.querySelector('.aeo-widget')).toBeNull()
    })

    it('should remove injected styles', () => {
      widget = new AEOWidget()
      
      expect(document.querySelector('style[data-aeo-widget]')).toBeDefined()
      
      widget.destroy()
      
      expect(document.querySelector('style[data-aeo-widget]')).toBeNull()
    })
  })

  describe('update', () => {
    it('should update widget options', () => {
      widget = new AEOWidget({
        theme: 'dark'
      })
      
      widget.update({
        theme: 'light'
      })
      
      const widgetEl = document.querySelector('.aeo-widget')
      expect(widgetEl?.getAttribute('data-theme')).toBe('light')
    })

    it('should refetch data on endpoint change', async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('New content')
      }
      
      ;(global.fetch as any).mockResolvedValue(mockResponse)
      
      widget = new AEOWidget({
        endpoint: '/old-endpoint'
      })
      
      widget.update({
        endpoint: '/new-endpoint'
      })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(global.fetch).toHaveBeenCalledWith('/new-endpoint')
    })
  })
})