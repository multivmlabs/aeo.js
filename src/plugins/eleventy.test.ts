import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import aeoEleventy from './eleventy';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/** Minimal mock of the Eleventy config API, capturing registered hooks. */
function createMockConfig() {
  const transforms: Record<string, (content: string, outputPath?: string) => string> = {};
  const events: Record<string, (arg: any) => void | Promise<void>> = {};
  return {
    transforms,
    events,
    addTransform(name: string, fn: any) {
      transforms[name] = fn;
    },
    on(event: string, fn: any) {
      events[event] = fn;
    },
  };
}

const html = (title: string, desc: string, body: string) =>
  `<html><head><title>${title}</title><meta name="description" content="${desc}"></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;

let outDir: string;

beforeEach(() => {
  outDir = mkdtempSync(join(tmpdir(), 'aeo-eleventy-'));
});

afterEach(() => {
  rmSync(outDir, { recursive: true, force: true });
});

describe('aeoEleventy', () => {
  it('generates AEO files from build results in eleventy.after', async () => {
    const config = createMockConfig();
    aeoEleventy(config as any, { url: 'https://mysite.com', title: 'My Site' });

    await config.events['eleventy.after']({
      directories: { output: outDir },
      results: [
        { outputPath: join(outDir, 'index.html'), url: '/', content: html('Home', 'Welcome', 'Homepage body content for testing.') },
        { outputPath: join(outDir, 'about', 'index.html'), url: '/about/', content: html('About', 'About us', 'About page body content here.') },
      ],
    });

    expect(existsSync(join(outDir, 'sitemap.xml'))).toBe(true);
    const sitemap = readFileSync(join(outDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://mysite.com');
    // Trailing slash from Eleventy URLs is normalized away.
    expect(sitemap).toContain('https://mysite.com/about');
    expect(sitemap).not.toContain('/about/</loc>');
  });

  it('falls back to dir.output (Eleventy 2.x) and skips non-HTML + 404 results', async () => {
    const config = createMockConfig();
    aeoEleventy(config as any, { url: 'https://mysite.com' });

    await config.events['eleventy.after']({
      dir: { output: outDir },
      results: [
        { outputPath: join(outDir, 'index.html'), url: '/', content: html('Home', 'Welcome', 'Body content.') },
        { outputPath: join(outDir, 'style.css'), url: '/style.css', content: 'body{}' },
        { outputPath: join(outDir, '404.html'), url: '/404/', content: html('Not found', '', 'x') },
      ],
    });

    const sitemap = readFileSync(join(outDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('<loc>https://mysite.com</loc>');
    expect(sitemap).not.toContain('style.css');
    expect(sitemap).not.toContain('/404');
  });

  it('lets config.pages override discovered pages', async () => {
    const config = createMockConfig();
    aeoEleventy(config as any, { url: 'https://mysite.com', pages: [{ pathname: '/custom', title: 'Custom' }] });

    await config.events['eleventy.after']({
      directories: { output: outDir },
      results: [{ outputPath: join(outDir, 'index.html'), url: '/', content: html('Home', 'Welcome', 'Body.') }],
    });

    const sitemap = readFileSync(join(outDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://mysite.com/custom');
  });

  describe('widget transform', () => {
    it('injects the widget script into HTML output by default', () => {
      const config = createMockConfig();
      aeoEleventy(config as any, { url: 'https://mysite.com' });

      const transform = config.transforms['aeo-widget'];
      expect(transform).toBeDefined();

      const input = '<html><body><h1>Hi</h1></body></html>';
      const output = transform.call({ page: { outputPath: join(outDir, 'index.html') } }, input);
      expect(output).toContain("import('aeo.js/widget')");
      expect(output.indexOf("import('aeo.js/widget')")).toBeLessThan(output.indexOf('</body>'));
    });

    it('leaves non-HTML output untouched', () => {
      const config = createMockConfig();
      aeoEleventy(config as any, { url: 'https://mysite.com' });

      const transform = config.transforms['aeo-widget'];
      const css = 'body { color: red; }';
      const output = transform.call({ page: { outputPath: join(outDir, 'style.css') } }, css);
      expect(output).toBe(css);
    });

    it('registers no transform when the widget is disabled', () => {
      const config = createMockConfig();
      aeoEleventy(config as any, { url: 'https://mysite.com', widget: { enabled: false } });
      expect(config.transforms['aeo-widget']).toBeUndefined();
    });
  });
});
