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
          background: '#0a0a0f',
          text: '#a0a0a8',
          accent: '#e8e8ea',
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

  private getMarkdownPath(): string {
    const currentPath = window.location.pathname;
    if (currentPath === '/' || currentPath.endsWith('/')) {
      return `${currentPath}index.md`;
    }
    return `${currentPath}.md`;
  }

  private async showOverlay(): Promise<void> {
    const icons = getIcons();
    const mdPath = this.getMarkdownPath();

    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'aeo-overlay';
    this.overlayElement.innerHTML = `
      <div class="aeo-topbar">
        ${this.config.widget?.showBadge !== false ? '<span class="aeo-badge"><span class="aeo-badge-dot"></span>LLM-READY</span>' : ''}
        <span class="aeo-route-tab">${mdPath}</span>
        <div class="aeo-topbar-spacer"></div>
        <div class="aeo-topbar-actions">
          <button class="aeo-topbar-btn aeo-copy-btn" disabled>
            ${icons.copy}
            <span>Copy</span>
          </button>
          <button class="aeo-topbar-btn aeo-download-btn" disabled>
            ${icons.download}
            <span>Download .md</span>
          </button>
          <button class="aeo-close-btn">
            ${icons.close}
            <span>Close</span>
          </button>
        </div>
      </div>
      <div class="aeo-content-area">
        <div class="aeo-content-wrapper">
          <div class="aeo-loading">
            ${icons.spinner}
            <span>Loading AI-optimized content...</span>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.overlayElement);

    const closeBtn = this.overlayElement.querySelector('.aeo-close-btn');
    closeBtn?.addEventListener('click', () => this.closeOverlay());

    await this.loadContent();
  }

  private async loadContent(): Promise<void> {
    if (!this.overlayElement) return;

    const wrapper = this.overlayElement.querySelector('.aeo-content-wrapper');
    if (!wrapper) return;

    try {
      const mdPath = this.getMarkdownPath();
      const response = await fetch(mdPath);
      let content: string;

      if (response.ok) {
        content = await response.text();
      } else {
        content = extractDOMToMarkdown();
      }

      wrapper.innerHTML = `
        <pre class="aeo-markdown-source"><code>${this.highlightMarkdown(content)}</code></pre>
      `;

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

    } catch {
      wrapper.innerHTML = `
        <div class="aeo-error">
          <p>Unable to load AI-optimized content.</p>
          <p>Try these alternatives:</p>
          <div>
            <a href="/llms.txt" target="_blank">llms.txt</a>
            <a href="/llms-full.txt" target="_blank">llms-full.txt</a>
          </div>
        </div>
      `;
    }
  }

  private highlightMarkdown(md: string): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const lines = md.split('\n');
    const out: string[] = [];
    let inFrontmatter = false;
    let inCode = false;
    let frontmatterStart = lines[0]?.trim() === '---';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Frontmatter handling
      if (i === 0 && frontmatterStart) {
        inFrontmatter = true;
        out.push(`<span class="hl-fm">${esc(line)}</span>`);
        continue;
      }
      if (inFrontmatter) {
        if (trimmed === '---') {
          inFrontmatter = false;
          out.push(`<span class="hl-fm">${esc(line)}</span>`);
        } else {
          out.push(`<span class="hl-fm">${esc(line)}</span>`);
        }
        continue;
      }

      // Code block
      if (trimmed.startsWith('```')) {
        inCode = !inCode;
        out.push(`<span class="hl-code">${esc(line)}</span>`);
        continue;
      }
      if (inCode) {
        out.push(`<span class="hl-code">${esc(line)}</span>`);
        continue;
      }

      // Headings
      if (/^#{1,6}\s/.test(trimmed)) {
        out.push(`<span class="hl-heading">${esc(line)}</span>`);
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        out.push(`<span class="hl-hr">${esc(line)}</span>`);
        continue;
      }

      // Blockquote
      if (trimmed.startsWith('>')) {
        out.push(`<span class="hl-quote">${esc(line)}</span>`);
        continue;
      }

      // List items
      if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
        out.push(this.highlightInline(esc(line)));
        continue;
      }

      // Regular text with inline highlights
      out.push(this.highlightInline(esc(line)));
    }

    return out.join('\n');
  }

  private highlightInline(escaped: string): string {
    // Bold **text**
    let text = escaped.replace(/\*\*(.+?)\*\*/g, '<span class="hl-bold">**$1**</span>');
    // Italic *text*
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<span class="hl-italic">*$1*</span>');
    // Inline code `text`
    text = text.replace(/`([^`]+)`/g, '<span class="hl-code">`$1`</span>');
    // Links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="hl-link">[<span class="hl-link-text">$1</span>](<span class="hl-link-url">$2</span>)</span>');
    return text;
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
    } catch {
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

export function createAeoWidget(options?: AeoWidgetOptions): AeoWidget {
  return new AeoWidget(options);
}
