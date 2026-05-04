/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AeoWidget } from './core';

describe('AeoWidget', () => {
  let widget: AeoWidget | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(''),
    });
  });

  afterEach(() => {
    if (widget) {
      widget.destroy();
      widget = null;
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create widget and inject into DOM', () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true, position: 'bottom-right' },
        },
      });

      expect(widget).toBeDefined();
      const toggle = document.querySelector('.aeo-toggle');
      expect(toggle).not.toBeNull();
    });

    it('should inject styles into head', () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true },
        },
      });

      const style = document.querySelector('style');
      expect(style).not.toBeNull();
      expect(style?.textContent).toContain('.aeo-toggle');
    });
  });

  describe('destroy', () => {
    it('should remove widget from DOM', () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true },
        },
      });

      expect(document.querySelector('.aeo-toggle')).not.toBeNull();

      widget.destroy();
      widget = null;

      expect(document.querySelector('.aeo-toggle')).toBeNull();
    });

    it('should remove keydown listener after destroy', () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true },
        },
      });

      const spy = vi.spyOn(document, 'removeEventListener');
      widget.destroy();
      widget = null;

      expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
      spy.mockRestore();
    });
  });

  describe('closeOverlay', () => {
    it('should not cause stack overflow from mutual recursion', async () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true },
        },
      });

      // Click AI button to open overlay
      const aiBtn = document.querySelector('.aeo-ai-btn') as HTMLElement;
      aiBtn?.click();

      // Wait for async overlay to appear
      await vi.waitFor(() => {
        expect(document.querySelector('.aeo-overlay')).not.toBeNull();
      });

      // Close overlay — if mutual recursion exists, this throws RangeError
      expect(() => {
        const closeBtn = document.querySelector('.aeo-close-btn') as HTMLElement;
        closeBtn?.click();
      }).not.toThrow();
    });
  });

  describe('switchToAI', () => {
    it('should show overlay when AI button is clicked', async () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true },
        },
      });

      const aiBtn = document.querySelector('.aeo-ai-btn') as HTMLElement;
      aiBtn?.click();

      await vi.waitFor(() => {
        expect(document.querySelector('.aeo-overlay')).not.toBeNull();
      });
    });

    it('should not create multiple overlays on rapid clicks', async () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true },
        },
      });

      const aiBtn = document.querySelector('.aeo-ai-btn') as HTMLElement;
      aiBtn?.click();
      aiBtn?.click();
      aiBtn?.click();

      await vi.waitFor(() => {
        expect(document.querySelector('.aeo-overlay')).not.toBeNull();
      });

      const overlays = document.querySelectorAll('.aeo-overlay');
      expect(overlays.length).toBe(1);
    });
  });

  describe('switchToHuman', () => {
    it('should close overlay when human button is clicked', async () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true },
        },
      });

      const aiBtn = document.querySelector('.aeo-ai-btn') as HTMLElement;
      aiBtn?.click();

      await vi.waitFor(() => {
        expect(document.querySelector('.aeo-overlay')).not.toBeNull();
      });

      const humanBtn = document.querySelector('.aeo-human-btn') as HTMLElement;
      humanBtn?.click();

      expect(document.querySelector('.aeo-overlay')).toBeNull();
    });
  });

  describe('keyboard events', () => {
    it('should close overlay on Escape key', async () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true },
        },
      });

      const aiBtn = document.querySelector('.aeo-ai-btn') as HTMLElement;
      aiBtn?.click();

      await vi.waitFor(() => {
        expect(document.querySelector('.aeo-overlay')).not.toBeNull();
      });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(document.querySelector('.aeo-overlay')).toBeNull();
    });

    it('should not throw when Escape is pressed without overlay', () => {
      widget = new AeoWidget({
        config: {
          title: 'Test',
          url: 'https://test.com',
          widget: { enabled: true },
        },
      });

      expect(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }).not.toThrow();
    });
  });
});
