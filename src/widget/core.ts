import type { AeoConfig } from '../types';
import { getStyles } from './styles';
import { getIcons } from './icons';
import { extractDOMToMarkdown } from './extract';

export interface AeoWidgetOptions {
  config?: Partial<AeoConfig>;
  container?: HTMLElement;
}

export class AeoWidget {
  private config: AeoConfig;
  private container: HTMLElement;
  private isAIMode: boolean = false;
  private toggleElement?: HTMLElement;
  private overlayElement?: HTMLElement;
  private styleElement?: HTMLStyleElement;

  constructor(options: AeoWidgetOptions = {}) {
    this.config = this.resolveConfig(options.config);
    this.container = options.container || document.body;
    
    if (this.config.widget?.enabled !== false) {
      this.init();
    }
  }

  private resolveConfig(config?: Partial<AeoConfig>): AeoConfig {
    const defaultConfig: AeoConfig = {
      title: document.title || 'Website',
      description: '',
      url: window.location.origin,
      contentDir: 'docs',
      outDir: 'dist',
      generators: {
        robotsTxt: true,
        llmsTxt: true,
        llmsFullTxt: true,
        rawMarkdown: true,
        manifest: true,
        sitemap: true,
        aiIndex: true,
      },
      widget: {
        enabled: true,
        position: 'bottom-right',
        theme: {
          background: 'rgba(18, 18, 24, 0.9)',
          text: '#C0C0C5',
          accent: '#E8E8EA',
          badge: '#4ADE80',
        },
        humanLabel: 'Human',
        aiLabel: 'AI',
        showBadge: true,
      },
    };

    return { ...defaultConfig, ...config };
  }

  private init(): void {
    this.injectStyles();
    this.createToggle();
    this.bindEvents();
  }

  private injectStyles(): void {
    if (this.styleElement) return;
    
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = getStyles(this.config.widget?.theme);
    document.head.appendChild(this.styleElement);
  }

  private createToggle(): void {
    const position = this.config.widget?.position || 'bottom-right';
    const icons = getIcons();
    
    this.toggleElement = document.createElement('div');
    this.toggleElement.className = `aeo-toggle aeo-${position}`;
    this.toggleElement.innerHTML = `
      <div class="aeo-toggle-inner">
        <button class="aeo-toggle-btn aeo-human-btn aeo-active" data-mode="human">
          ${icons.human}
          <span>${this.config.widget?.humanLabel || 'Human'}</span>
        </button>
        <button class="aeo-toggle-btn aeo-ai-btn" data-mode="ai">
          ${icons.ai}
          <span>${this.config.widget?.aiLabel || 'AI'}</span>
        </button>
      </div>
    `;
    
    this.container.appendChild(this.toggleElement);
  }

  private bindEvents(): void {
    if (!this.toggleElement) return;

    this.toggleElement.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.aeo-toggle-btn') as HTMLElement;
      if (!btn) return;

      const mode = btn.dataset.mode;
      if (mode === 'ai' && !this.isAIMode) {
        this.switchToAI();
      } else if (mode === 'human' && this.isAIMode) {
        this.switchToHuman();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlayElement) {
        this.closeOverlay();
      }
    });
  }

  private async switchToAI(): Promise<void> {
    this.isAIMode = true;
    this.updateToggleState();
    await this.showOverlay();
  }

  private switchToHuman(): void {
    this.isAIMode = false;
    this.updateToggleState();
    this.closeOverlay();
  }

  private updateToggleState(): void {
    if (!this.toggleElement) return;

    const humanBtn = this.toggleElement.querySelector('.aeo-human-btn');
    const aiBtn = this.toggleElement.querySelector('.aeo-ai-btn');

    if (this.isAIMode) {
      humanBtn?.classList.remove('aeo-active');
      aiBtn?.classList.add('aeo-active');
    } else {
      humanBtn?.classList.add('aeo-active');
      aiBtn?.classList.remove('aeo-active');
    }
  }

  private async showOverlay(): Promise<void> {
    const icons = getIcons();
    
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'aeo-overlay';
    this.overlayElement.innerHTML = `
      <div class="aeo-overlay-content">
        <div class="aeo-overlay-header">
          <h2>AI-Optimized View</h2>
          ${this.config.widget?.showBadge ? '<span class="aeo-badge">LLM-ready</span>' : ''}
          <button class="aeo-close-btn" aria-label="Close">${icons.close}</button>
        </div>
        <div class="aeo-overlay-body">
          <div class="aeo-loading">
            ${icons.spinner}
            <span>Loading AI-optimized content...</span>
          </div>
        </div>
        <div class="aeo-overlay-footer">
          <button class="aeo-copy-btn" disabled>${icons.copy} Copy Markdown</button>
          <button class="aeo-download-btn" disabled>${icons.download} Download .md</button>
        </div>
      </div>
    `;
    
    this.container.appendChild(this.overlayElement);
    
    // Bind overlay events
    const closeBtn = this.overlayElement.querySelector('.aeo-close-btn');
    closeBtn?.addEventListener('click', () => this.closeOverlay());
    
    // Fetch content
    await this.loadContent();
  }

  private async loadContent(): Promise<void> {
    if (!this.overlayElement) return;
    
    const bodyElement = this.overlayElement.querySelector('.aeo-overlay-body');
    if (!bodyElement) return;

    try {
      // Try to fetch markdown version
      const currentPath = window.location.pathname;
      const markdownPath = currentPath.endsWith('/') 
        ? `${currentPath}index.md`
        : `${currentPath}.md`;
      
      const response = await fetch(markdownPath);
      let content: string;
      
      if (response.ok) {
        content = await response.text();
      } else {
        // Fallback to DOM extraction
        content = extractDOMToMarkdown();
      }
      
      // Display content
      bodyElement.innerHTML = `
        <div class="aeo-markdown-url">
          <span>Markdown URL:</span>
          <code>${window.location.origin}${markdownPath}</code>
        </div>
        <pre class="aeo-markdown-content">${this.escapeHtml(content)}</pre>
      `;
      
      // Enable buttons
      const copyBtn = this.overlayElement.querySelector('.aeo-copy-btn') as HTMLButtonElement;
      const downloadBtn = this.overlayElement.querySelector('.aeo-download-btn') as HTMLButtonElement;
      
      if (copyBtn) {
        copyBtn.disabled = false;
        copyBtn.addEventListener('click', () => this.copyToClipboard(content));
      }
      
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.addEventListener('click', () => this.downloadMarkdown(content));
      }
      
    } catch (error) {
      // Show error with fallback links
      bodyElement.innerHTML = `
        <div class="aeo-error">
          <p>Unable to load AI-optimized content.</p>
          <p>Try these alternatives:</p>
          <ul>
            <li><a href="/llms.txt" target="_blank">View llms.txt</a></li>
            <li><a href="/llms-full.txt" target="_blank">View llms-full.txt</a></li>
          </ul>
        </div>
      `;
    }
  }

  private closeOverlay(): void {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = undefined;
    }
    this.switchToHuman();
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard!');
    } catch (err) {
      this.showToast('Failed to copy');
    }
  }

  private downloadMarkdown(content: string): void {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.sanitizeFilename(document.title)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'aeo-toast';
    toast.textContent = message;
    this.container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('aeo-toast-show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('aeo-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  public destroy(): void {
    this.toggleElement?.remove();
    this.overlayElement?.remove();
    this.styleElement?.remove();
  }
}

// Auto-init on DOM ready
if (typeof window !== 'undefined') {
  const init = () => {
    if (!(window as any).__aeoWidget) {
      (window as any).__aeoWidget = new AeoWidget();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

export function createAeoWidget(options?: AeoWidgetOptions): AeoWidget {
  return new AeoWidget(options);
}