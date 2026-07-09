import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import aeoDocusaurus from './docusaurus';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let outDir: string;

beforeEach(() => {
  outDir = mkdtempSync(join(tmpdir(), 'aeo-docusaurus-'));
});

afterEach(() => {
  rmSync(outDir, { recursive: true, force: true });
});

/** Write an HTML page into the build output at a route path. */
function page(routePath: string, title: string, description: string, body: string): void {
  const dir = routePath === '/' ? outDir : join(outDir, routePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'index.html'),
    `<html><head><title>${title}</title><meta name="description" content="${description}"></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`,
    'utf-8'
  );
}

const context = {
  siteConfig: { url: 'https://mysite.com', baseUrl: '/', title: 'My Docs', tagline: 'Great docs' },
};

describe('aeoDocusaurus plugin', () => {
  it('has the expected plugin name', () => {
    const plugin = aeoDocusaurus(context, {});
    expect(plugin.name).toBe('aeo-docusaurus');
  });

  it('generates AEO files from build output in postBuild', async () => {
    page('/', 'Home', 'Welcome to my docs', 'This is the homepage content for the docs site.');
    page('docs/intro', 'Intro', 'Getting started', 'Introduction to the project and how to begin.');

    const plugin = aeoDocusaurus(context, {});
    await plugin.postBuild({ siteConfig: context.siteConfig, outDir, baseUrl: '/' });

    expect(existsSync(join(outDir, 'sitemap.xml'))).toBe(true);
    expect(existsSync(join(outDir, 'llms.txt'))).toBe(true);
    const sitemap = readFileSync(join(outDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://mysite.com');
    expect(sitemap).toContain('https://mysite.com/docs/intro');
  });

  it('defaults url/title/description from the Docusaurus site config', async () => {
    page('/', 'Home', 'Welcome', 'Homepage content here for testing purposes.');
    const plugin = aeoDocusaurus(context, {});
    await plugin.postBuild({ siteConfig: context.siteConfig, outDir, baseUrl: '/' });

    const llms = readFileSync(join(outDir, 'llms.txt'), 'utf-8');
    expect(llms).toContain('My Docs');
  });

  it('folds a non-root baseUrl into generated URLs', async () => {
    page('/', 'Home', 'Welcome', 'Homepage content here for testing purposes.');
    const projectContext = {
      siteConfig: { url: 'https://mysite.com', baseUrl: '/project/', title: 'Proj', tagline: 't' },
    };
    const plugin = aeoDocusaurus(projectContext, {});
    await plugin.postBuild({ siteConfig: projectContext.siteConfig, outDir, baseUrl: '/project/' });

    const sitemap = readFileSync(join(outDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://mysite.com/project');
  });

  it('lets explicit options override the site config', async () => {
    page('/', 'Home', 'Welcome', 'Homepage content here for testing purposes.');
    const plugin = aeoDocusaurus(context, { url: 'https://custom.example', title: 'Custom' });
    await plugin.postBuild({ siteConfig: context.siteConfig, outDir, baseUrl: '/' });

    const sitemap = readFileSync(join(outDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://custom.example');
    expect(sitemap).not.toContain('https://mysite.com');
  });

  describe('injectHtmlTags', () => {
    it('injects the widget script by default', () => {
      const plugin = aeoDocusaurus(context, {});
      const tags = plugin.injectHtmlTags();
      expect(tags.postBodyTags).toBeDefined();
      expect(tags.postBodyTags![0]).toContain("import('aeo.js/widget')");
    });

    it('injects nothing when the widget is disabled', () => {
      const plugin = aeoDocusaurus(context, { widget: { enabled: false } });
      const tags = plugin.injectHtmlTags();
      expect(tags.postBodyTags).toBeUndefined();
    });
  });
});
