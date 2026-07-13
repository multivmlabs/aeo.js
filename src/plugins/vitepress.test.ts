import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withAeo, getWidgetScript } from './vitepress';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const html = (title: string, desc: string, body: string) =>
  `<html><head><title>${title}</title><meta name="description" content="${desc}"></head><body><h1>${title}</h1><p>${body}</p></body></html>`;

const ctx = (page: string, title: string, desc: string) => ({
  page,
  pageData: { relativePath: page, title, description: desc },
  title,
  description: desc,
});

let outDir: string;

beforeEach(() => {
  outDir = mkdtempSync(join(tmpdir(), 'aeo-vitepress-'));
});

afterEach(() => {
  rmSync(outDir, { recursive: true, force: true });
});

describe('withAeo', () => {
  it('collects pages via transformHtml and generates AEO files in buildEnd', async () => {
    const config = withAeo({}, { url: 'https://mysite.com', title: 'My Docs' });

    await config.transformHtml!(html('Home', 'Welcome', 'Homepage content body.'), 'index.html', ctx('index.md', 'Home', 'Welcome'));
    await config.transformHtml!(html('Guide', 'The guide', 'Guide content body here.'), 'guide.html', ctx('guide/index.md', 'Guide', 'The guide'));

    await config.buildEnd!({ outDir, site: { title: 'My Docs', description: 'Docs' } });

    expect(existsSync(join(outDir, 'sitemap.xml'))).toBe(true);
    const sitemap = readFileSync(join(outDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('<loc>https://mysite.com</loc>');
    expect(sitemap).toContain('https://mysite.com/guide');
  });

  it('injects the widget before </body> during transformHtml', async () => {
    const config = withAeo({}, { url: 'https://mysite.com' });
    const out = (await config.transformHtml!('<html><body><h1>Hi</h1></body></html>', 'index.html', ctx('index.md', 'Hi', ''))) as string;
    expect(out).toContain("import('aeo.js/widget')");
    expect(out.indexOf("import('aeo.js/widget')")).toBeLessThan(out.indexOf('</body>'));
  });

  it('does not inject when the widget is disabled', async () => {
    const config = withAeo({}, { url: 'https://mysite.com', widget: { enabled: false } });
    const input = '<html><body><h1>Hi</h1></body></html>';
    const out = (await config.transformHtml!(input, 'index.html', ctx('index.md', 'Hi', ''))) as string;
    expect(out).toBe(input);
  });

  it('defaults url from sitemap.hostname and title from site config', async () => {
    const config = withAeo({}, {});
    await config.transformHtml!(html('Home', 'Welcome', 'Body content here.'), 'index.html', ctx('index.md', 'Home', 'Welcome'));
    await config.buildEnd!({ outDir, site: { title: 'Site Title', description: 'd' }, sitemap: { hostname: 'https://fromsitemap.com' } });

    const sitemap = readFileSync(join(outDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://fromsitemap.com');
    const llms = readFileSync(join(outDir, 'llms.txt'), 'utf-8');
    expect(llms).toContain('Site Title');
  });

  it('preserves user-defined transformHtml and buildEnd hooks', async () => {
    const userTransform = vi.fn((code: string) => code.replace('<h1>', '<h1 data-user="1">'));
    const userBuildEnd = vi.fn();
    const config = withAeo({ transformHtml: userTransform, buildEnd: userBuildEnd }, { url: 'https://mysite.com' });

    const out = (await config.transformHtml!('<html><body><h1>Hi</h1></body></html>', 'index.html', ctx('index.md', 'Hi', ''))) as string;
    expect(userTransform).toHaveBeenCalled();
    expect(out).toContain('data-user="1"'); // user transform applied
    expect(out).toContain("import('aeo.js/widget')"); // and ours too

    await config.buildEnd!({ outDir, site: {} });
    expect(userBuildEnd).toHaveBeenCalled();
  });

  it('lets config.pages override discovered pages', async () => {
    const config = withAeo({}, { url: 'https://mysite.com', pages: [{ pathname: '/custom', title: 'Custom' }] });
    await config.transformHtml!(html('Home', 'W', 'Body.'), 'index.html', ctx('index.md', 'Home', 'W'));
    await config.buildEnd!({ outDir, site: {} });

    const sitemap = readFileSync(join(outDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://mysite.com/custom');
  });
});

describe('getWidgetScript', () => {
  it('returns a script when enabled and empty string when disabled', () => {
    expect(getWidgetScript({ url: 'https://mysite.com' })).toContain("import('aeo.js/widget')");
    expect(getWidgetScript({ url: 'https://mysite.com', widget: { enabled: false } })).toBe('');
  });
});
