import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generate, postBuild, getWidgetScript, tanstackRouteToPathname } from './tanstack-start';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let projectDir: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  projectDir = mkdtempSync(join(tmpdir(), 'aeo-tanstack-'));
  process.chdir(projectDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(projectDir, { recursive: true, force: true });
});

/** Write a route file (creating parent dirs) relative to src/routes. */
function route(relPath: string, body = 'export const Route = {};'): void {
  const full = join(projectDir, 'src', 'routes', relPath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, body, 'utf-8');
}

describe('tanstackRouteToPathname', () => {
  it('maps flat and directory route ids to pathnames', () => {
    expect(tanstackRouteToPathname('index')).toBe('/');
    expect(tanstackRouteToPathname('about')).toBe('/about');
    expect(tanstackRouteToPathname('posts.index')).toBe('/posts');
    expect(tanstackRouteToPathname('posts/index')).toBe('/posts');
    expect(tanstackRouteToPathname('docs/getting-started')).toBe('/docs/getting-started');
  });

  it('treats route.tsx as a layout token for its directory', () => {
    expect(tanstackRouteToPathname('posts/route')).toBe('/posts');
    // A standalone route.tsx is a real /route page.
    expect(tanstackRouteToPathname('route')).toBe('/route');
  });

  it('returns null for dynamic segments and splats', () => {
    expect(tanstackRouteToPathname('posts.$postId')).toBeNull();
    expect(tanstackRouteToPathname('posts/$postId')).toBeNull();
    expect(tanstackRouteToPathname('files.$')).toBeNull();
  });

  it('omits pathless layout segments', () => {
    expect(tanstackRouteToPathname('_pathless.dashboard')).toBe('/dashboard');
    expect(tanstackRouteToPathname('_auth/settings')).toBe('/settings');
  });

  it('un-nests on a trailing underscore but keeps the path', () => {
    expect(tanstackRouteToPathname('posts_.stats')).toBe('/posts/stats');
  });

  it('excludes the root layout and dash-prefixed files', () => {
    expect(tanstackRouteToPathname('__root')).toBeNull();
    expect(tanstackRouteToPathname('-ignored')).toBeNull();
  });

  it('unescapes bracketed segments', () => {
    expect(tanstackRouteToPathname('[home-page]')).toBe('/home-page');
  });
});

describe('generate (source routes)', () => {
  it('discovers nested routes, skipping dynamic and excluded ones', async () => {
    route('index.tsx');
    route('about.tsx');
    route('posts/index.tsx');
    route('posts/$postId.tsx'); // dynamic → skipped
    route('__root.tsx'); // layout → skipped
    route('-helpers.ts'); // excluded → skipped
    writeFileSync(join(projectDir, 'src', 'routes', 'routeTree.gen.ts'), '// generated', 'utf-8');

    await generate({ title: 'My Site', url: 'https://example.com' });

    const sitemap = readFileSync(join(projectDir, 'public', 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://example.com/');
    expect(sitemap).toContain('https://example.com/about');
    expect(sitemap).toContain('https://example.com/posts');
    expect(sitemap).not.toContain('$postId');
    expect(sitemap).not.toContain('routeTree');
    expect(sitemap).not.toContain('__root');
  });

  it('falls back to a root page when no routes dir exists', async () => {
    await generate({ title: 'Empty', url: 'https://example.com' });
    const sitemap = readFileSync(join(projectDir, 'public', 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('<loc>https://example.com</loc>');
  });

  it('lets config.pages override discovered routes', async () => {
    route('index.tsx');
    await generate({
      url: 'https://example.com',
      pages: [{ pathname: '/custom', title: 'Custom' }],
    });
    const sitemap = readFileSync(join(projectDir, 'public', 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://example.com/custom');
  });
});

describe('postBuild (build output)', () => {
  it('prefers prerendered HTML content and writes files into the output dir', async () => {
    const outDir = join(projectDir, '.output', 'public');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, 'index.html'),
      '<html><head><title>Home</title><meta name="description" content="Welcome"></head><body><h1>Home</h1><p>Hello world content here.</p></body></html>',
      'utf-8'
    );
    route('index.tsx');

    await postBuild({ url: 'https://example.com' });

    expect(existsSync(join(outDir, 'sitemap.xml'))).toBe(true);
    const llms = readFileSync(join(outDir, 'llms.txt'), 'utf-8');
    expect(llms).toContain('https://example.com');
  });

  it('warns and no-ops when no output dir is found', async () => {
    // No build output and no outDir override.
    await expect(postBuild({ url: 'https://example.com' })).resolves.toBeUndefined();
    expect(existsSync(join(projectDir, 'sitemap.xml'))).toBe(false);
  });
});

describe('getWidgetScript', () => {
  it('returns a module script when the widget is enabled', () => {
    const script = getWidgetScript({ url: 'https://example.com' });
    expect(script).toContain('<script type="module">');
    expect(script).toContain("import('aeo.js/widget')");
  });

  it('returns an empty string when the widget is disabled', () => {
    const script = getWidgetScript({ url: 'https://example.com', widget: { enabled: false } });
    expect(script).toBe('');
  });
});
