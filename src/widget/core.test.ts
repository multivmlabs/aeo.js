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
  });
});
