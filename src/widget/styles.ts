export interface ThemeConfig {
  background?: string;
  text?: string;
  accent?: string;
  badge?: string;
}

export function getStyles(theme?: ThemeConfig): string {
  const t = {
    background: theme?.background || 'rgba(18, 18, 24, 0.9)',
    text: theme?.text || '#C0C0C5',
    accent: theme?.accent || '#E8E8EA',
    badge: theme?.badge || '#4ADE80',
  };

  return `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
    
    .aeo-toggle {
      position: fixed;
      z-index: 9998;
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
    
    .aeo-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: aeo-fade-in 0.3s ease;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .aeo-overlay-content {
      background: ${t.background};
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      animation: aeo-slide-up 0.3s ease;
    }
    
    .aeo-overlay-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .aeo-overlay-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: ${t.accent};
      flex: 1;
    }
    
    .aeo-badge {
      background: ${t.badge};
      color: ${t.background};
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .aeo-close-btn {
      background: transparent;
      border: none;
      color: ${t.text};
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    
    .aeo-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: ${t.accent};
    }
    
    .aeo-close-btn svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }
    
    .aeo-overlay-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      color: ${t.text};
    }
    
    .aeo-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 48px;
    }
    
    .aeo-loading svg {
      width: 32px;
      height: 32px;
      fill: ${t.accent};
      animation: aeo-spin 1s linear infinite;
    }
    
    .aeo-markdown-url {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    
    .aeo-markdown-url span {
      color: ${t.text};
      opacity: 0.7;
    }
    
    .aeo-markdown-url code {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      color: ${t.accent};
      background: transparent;
    }
    
    .aeo-markdown-content {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: ${t.text};
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
    }
    
    .aeo-error {
      text-align: center;
      padding: 48px 24px;
      color: ${t.text};
    }
    
    .aeo-error p {
      margin: 0 0 16px;
    }
    
    .aeo-error ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .aeo-error li {
      margin: 8px 0;
    }
    
    .aeo-error a {
      color: ${t.accent};
      text-decoration: none;
      padding: 8px 16px;
      border: 1px solid ${t.accent};
      border-radius: 8px;
      display: inline-block;
      transition: all 0.2s ease;
    }
    
    .aeo-error a:hover {
      background: ${t.accent};
      color: ${t.background};
    }
    
    .aeo-overlay-footer {
      display: flex;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .aeo-overlay-footer button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      background: transparent;
      color: ${t.text};
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .aeo-overlay-footer button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .aeo-overlay-footer button:not(:disabled):hover {
      background: ${t.accent};
      color: ${t.background};
      border-color: ${t.accent};
    }
    
    .aeo-overlay-footer button svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    
    .aeo-toast {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: ${t.background};
      color: ${t.accent};
      padding: 12px 24px;
      border-radius: 8px;
      border: 1px solid ${t.accent};
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 10000;
    }
    
    .aeo-toast.aeo-toast-show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    
    @keyframes aeo-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes aeo-slide-up {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes aeo-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    @media (max-width: 600px) {
      .aeo-toggle {
        bottom: 10px !important;
        right: 10px !important;
        left: 10px !important;
        top: auto !important;
      }
      
      .aeo-toggle.aeo-top-left,
      .aeo-toggle.aeo-top-right {
        top: 10px !important;
        bottom: auto !important;
      }
      
      .aeo-overlay-content {
        width: 95%;
        max-height: 90vh;
        border-radius: 12px;
      }
      
      .aeo-toggle-btn {
        padding: 6px 12px;
        font-size: 13px;
      }
      
      .aeo-toggle-btn span {
        display: none;
      }
      
      .aeo-overlay-footer {
        flex-direction: column;
      }
      
      .aeo-overlay-footer button {
        width: 100%;
      }
    }
    
    @media (prefers-reduced-motion: reduce) {
      .aeo-toggle,
      .aeo-overlay,
      .aeo-overlay-content,
      .aeo-toast {
        animation: none;
        transition: none;
      }
    }
  `.trim();
}