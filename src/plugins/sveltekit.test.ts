import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { postBuild, generate, getWidgetScript } from './sveltekit';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let projectDir: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  projectDir = mkdtempSync(join(tmpdir(), 'aeo-sveltekit-'));
  process.chdir(projectDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(projectDir, { recursive: true, force: true });
});

function writePage(relDir: string, html: string): void {
  const dir = join(projectDir, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf-8');
}

const HTML = (title: string) =>
  `<!doctype html><html><head><title>${title}</title><meta name="description" content="Description for ${title} that is long enough."></head><body><h1>${title}</h1><p>Some real content about ${title} for extraction purposes.</p></body></html>`;

describe('getWidgetScript', () => {
  it('returns a module script with the widget config', () => {
    const script = getWidgetScript({ title: 'My Site', url: 'https://mysite.com' });
    expect(script).toContain('<script type="module">');
    expect(script).toContain("import('aeo.js/widget')");
    expect(script).toContain('My Site');
  });

  it('returns empty string when the widget is disabled', () => {
    expect(getWidgetScript({ widget: { enabled: false } })).toBe('');
  });
});

describe('generate (source routes)', () => {
  it('discovers routes from src/routes, skipping dynamic and group segments', async () => {
    const routes = join(projectDir, 'src', 'routes');
    mkdirSync(join(routes, 'about'), { recursive: true });
    mkdirSync(join(routes, '(marketing)', 'pricing'), { recursive: true });
    mkdirSync(join(routes, 'blog', '[slug]'), { recursive: true });
    writeFileSync(join(routes, '+page.svelte'), '<h1>Home</h1>');
    writeFileSync(join(routes, 'about', '+page.svelte'), '<h1>About</h1>');
    writeFileSync(join(routes, '(marketing)', 'pricing', '+page.svelte'), '<h1>Pricing</h1>');
    writeFileSync(join(routes, 'blog', '[slug]', '+page.svelte'), '<h1>Post</h1>');

    await generate({ title: 'My Site', url: 'https://mysite.com', widget: { enabled: false } });

    const llms = readFileSync(join(projectDir, 'static', 'llms.txt'), 'utf-8');
    expect(llms).toContain('/about');
    // (marketing) group does not contribute a URL segment
    expect(llms).toContain('/pricing');
    expect(llms).not.toContain('(marketing)');
    expect(llms).not.toContain('[slug]');
  });
});

describe('postBuild (adapter-static)', () => {
  it('scans build/ output, generates AEO files, and injects the widget', async () => {
    writePage('build', HTML('Home'));
    writePage('build/about', HTML('About'));

    await postBuild({ title: 'My Site', url: 'https://mysite.com' });

    expect(existsSync(join(projectDir, 'build', 'robots.txt'))).toBe(true);
    expect(existsSync(join(projectDir, 'build', 'llms.txt'))).toBe(true);
    expect(existsSync(join(projectDir, 'build', 'sitemap.xml'))).toBe(true);

    const llms = readFileSync(join(projectDir, 'build', 'llms.txt'), 'utf-8');
    expect(llms).toContain('/about');

    const home = readFileSync(join(projectDir, 'build', 'index.html'), 'utf-8');
    expect(home).toContain("import('aeo.js/widget')");
  });

  it('does not inject the widget when disabled', async () => {
    writePage('build', HTML('Home'));

    await postBuild({ title: 'My Site', url: 'https://mysite.com', widget: { enabled: false } });

    const home = readFileSync(join(projectDir, 'build', 'index.html'), 'utf-8');
    expect(home).not.toContain('aeo.js/widget');
  });

  it('does not double-inject the widget on repeated runs', async () => {
    writePage('build', HTML('Home'));

    await postBuild({ title: 'My Site', url: 'https://mysite.com' });
    await postBuild({ title: 'My Site', url: 'https://mysite.com' });

    const home = readFileSync(join(projectDir, 'build', 'index.html'), 'utf-8');
    expect(home.match(/aeo\.js\/widget/g)).toHaveLength(1);
  });

  it('falls back to .svelte-kit output for non-static adapters', async () => {
    writePage('.svelte-kit/output/client', '<!doctype html><html><body></body></html>');
    // remove the placeholder html — client dir usually only has assets
    rmSync(join(projectDir, '.svelte-kit', 'output', 'client', 'index.html'));
    writePage('.svelte-kit/output/prerendered/pages', HTML('Home'));

    await postBuild({ title: 'My Site', url: 'https://mysite.com', widget: { enabled: false } });

    const outDir = join(projectDir, '.svelte-kit', 'output', 'client');
    expect(existsSync(join(outDir, 'robots.txt'))).toBe(true);

    const llms = readFileSync(join(outDir, 'llms.txt'), 'utf-8');
    expect(llms).toContain('Home');
  });
});
