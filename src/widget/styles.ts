export interface ThemeConfig {
  background?: string;
  text?: string;
  accent?: string;
  badge?: string;
}

export function getStyles(theme?: ThemeConfig): string {
  const t = {
    background: theme?.background || '#0a0a0f',
    text: theme?.text || '#a0a0a8',
    accent: theme?.accent || '#e8e8ea',
    badge: theme?.badge || '#4ADE80',
  };

  return `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

    .aeo-toggle {
      position: fixed;
      z-index: 10001;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      animation: aeo-fade-in 0.3s ease;
    }

    .aeo-toggle.aeo-bottom-right {
      bottom: 20px;
      right: 20px;
    }

    .aeo-toggle.aeo-bottom-left {
      bottom: 20px;
      left: 20px;
    }

    .aeo-toggle.aeo-top-right {
      top: 20px;
      right: 20px;
    }

    .aeo-toggle.aeo-top-left {
      top: 20px;
      left: 20px;
    }

    .aeo-toggle-inner {
      display: flex;
      background: ${t.background};
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 4px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .aeo-toggle-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: none;
      background: transparent;
      color: ${t.text};
      cursor: pointer;
      border-radius: 20px;
      transition: all 0.2s ease;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
    }

    .aeo-toggle-btn svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    .aeo-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .aeo-toggle-btn.aeo-active {
      background: ${t.accent};
      color: ${t.background};
    }

    /* Full-screen overlay */
    .aeo-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${t.background};
      z-index: 10000;
      display: flex;
      flex-direction: column;
      animation: aeo-fade-in 0.2s ease;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Top bar */
    .aeo-topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.02);
      flex-shrink: 0;
    }

    .aeo-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(74, 222, 128, 0.1);
      color: ${t.badge};
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border: 1px solid rgba(74, 222, 128, 0.2);
    }

    .aeo-badge-dot {
      width: 6px;
      height: 6px;
      background: ${t.badge};
      border-radius: 50%;
      flex-shrink: 0;
    }

    .aeo-route-tab {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      background: rgba(255, 255, 255, 0.05);
      color: ${t.accent};
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .aeo-topbar-spacer {
      flex: 1;
    }

    .aeo-topbar-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .aeo-topbar-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: transparent;
      color: ${t.text};
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .aeo-topbar-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.05);
      color: ${t.accent};
      border-color: rgba(255, 255, 255, 0.2);
    }

    .aeo-topbar-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .aeo-topbar-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }

    .aeo-close-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: transparent;
      color: ${t.text};
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .aeo-close-btn:hover {
      background: rgba(255, 60, 60, 0.1);
      color: #ff6b6b;
      border-color: rgba(255, 60, 60, 0.3);
    }

    .aeo-close-btn svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
    }

    /* Content area */
    .aeo-content-area {
      flex: 1;
      overflow-y: auto;
      padding: 40px 24px;
    }

    .aeo-content-wrapper {
      max-width: 800px;
      margin: 0 auto;
    }

    .aeo-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 80px 24px;
      color: ${t.text};
    }

    .aeo-loading svg {
      width: 24px;
      height: 24px;
      fill: ${t.text};
      animation: aeo-spin 1s linear infinite;
    }

    .aeo-loading span {
      font-size: 13px;
      opacity: 0.6;
    }

    /* Markdown source display */
    .aeo-markdown-source {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.7;
      color: ${t.text};
      background: transparent;
      margin: 0;
      padding: 0;
      border: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-x: auto;
    }

    .aeo-markdown-source code {
      font-family: inherit;
      background: transparent;
    }

    .aeo-markdown-source .hl-fm {
      color: rgba(160, 160, 168, 0.5);
    }

    .aeo-markdown-source .hl-heading {
      color: ${t.accent};
      font-weight: 600;
    }

    .aeo-markdown-source .hl-bold {
      color: ${t.accent};
      font-weight: 600;
    }

    .aeo-markdown-source .hl-italic {
      font-style: italic;
      color: ${t.accent};
      opacity: 0.85;
    }

    .aeo-markdown-source .hl-code {
      color: ${t.badge};
    }

    .aeo-markdown-source .hl-link {
      color: rgba(160, 160, 168, 0.6);
    }

    .aeo-markdown-source .hl-link-text {
      color: ${t.badge};
    }

    .aeo-markdown-source .hl-link-url {
      color: rgba(160, 160, 168, 0.4);
    }

    .aeo-markdown-source .hl-quote {
      color: ${t.text};
      opacity: 0.7;
      font-style: italic;
    }

    .aeo-markdown-source .hl-hr {
      color: rgba(160, 160, 168, 0.3);
    }

    .aeo-error {
      text-align: center;
      padding: 80px 24px;
      color: ${t.text};
    }

    .aeo-error p {
      margin: 0 0 16px;
      font-size: 14px;
    }

    .aeo-error a {
      color: ${t.accent};
      text-decoration: none;
      padding: 8px 16px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      display: inline-block;
      margin: 4px;
      font-size: 13px;
      transition: all 0.15s ease;
    }

    .aeo-error a:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .aeo-toast {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: ${t.background};
      color: ${t.accent};
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 10002;
    }

    .aeo-toast.aeo-toast-show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    @keyframes aeo-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes aeo-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .aeo-toggle {
        bottom: 12px !important;
        right: 12px !important;
        left: auto !important;
        top: auto !important;
      }

      .aeo-toggle-btn {
        padding: 6px 12px;
        font-size: 13px;
      }

      .aeo-toggle-btn span {
        display: none;
      }

      .aeo-topbar {
        padding: 10px 16px;
        gap: 8px;
        flex-wrap: wrap;
      }

      .aeo-topbar-btn span {
        display: none;
      }

      .aeo-close-btn span {
        display: none;
      }

      .aeo-content-area {
        padding: 24px 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .aeo-toggle,
      .aeo-overlay,
      .aeo-toast {
        animation: none;
        transition: none;
      }
    }
  `.trim();
}
