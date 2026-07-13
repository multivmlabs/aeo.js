import { describe, it, expect } from 'vitest';
import { contentFileToPathname, buildPageUrl } from './url';

describe('contentFileToPathname', () => {
  it('collapses a top-level index file to the site root', () => {
    expect(contentFileToPathname('index.md')).toBe('/');
    expect(contentFileToPathname('index.mdx')).toBe('/');
  });

  it('collapses a nested index file to its directory', () => {
    expect(contentFileToPathname('guide/index.md')).toBe('/guide');
    expect(contentFileToPathname('a/b/index.mdx')).toBe('/a/b');
  });

  it('strips the extension for named files', () => {
    expect(contentFileToPathname('features/audit.mdx')).toBe('/features/audit');
    expect(contentFileToPathname('about.md')).toBe('/about');
    expect(contentFileToPathname('page.html')).toBe('/page');
  });
});

describe('buildPageUrl', () => {
  it('maps the site root to the bare base URL by default', () => {
    expect(buildPageUrl('https://x.com', '/')).toBe('https://x.com');
    expect(buildPageUrl('https://x.com/', '/')).toBe('https://x.com');
  });

  it("preserves the pathname's own trailing slash by default", () => {
    expect(buildPageUrl('https://x.com', '/about')).toBe('https://x.com/about');
    expect(buildPageUrl('https://x.com', '/about/')).toBe('https://x.com/about/');
  });

  it("forces a trailing slash with 'always'", () => {
    expect(buildPageUrl('https://x.com', '/about', 'always')).toBe('https://x.com/about/');
    expect(buildPageUrl('https://x.com', '/about/', 'always')).toBe('https://x.com/about/');
    expect(buildPageUrl('https://x.com', '/', 'always')).toBe('https://x.com/');
  });

  it("strips a trailing slash with 'never'", () => {
    expect(buildPageUrl('https://x.com', '/about/', 'never')).toBe('https://x.com/about');
    expect(buildPageUrl('https://x.com', '/about', 'never')).toBe('https://x.com/about');
    expect(buildPageUrl('https://x.com', '/', 'never')).toBe('https://x.com');
  });
});
