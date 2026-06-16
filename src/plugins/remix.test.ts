import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { postBuild, generate, getWidgetScript, remixRouteToPathname } from './remix';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let projectDir: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  projectDir = mkdtempSync(join(tmpdir(), 'aeo-remix-'));
  process.chdir(projectDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(projectDir, { recursive: true, force: true });
});

describe('remixRouteToPathname', () => {
  it('maps flat-route ids to pathnames', () => {
    expect(remixRouteToPathname('_index')).toBe('/');
    expect(remixRouteToPathname('about')).toBe('/about');
    expect(remixRouteToPathname('blog._index')).toBe('/blog');
    expect(remixRouteToPathname('docs.getting-started')).toBe('/docs/getting-started');
  });

  it('returns null for dynamic segments', () => {
    expect(remixRouteToPathname('blog.$slug')).toBeNull();
    expect(remixRouteToPathname('files.$')).toBeNull();
  });

  it('omits pathless layouts and optional segments', () => {
    expect(remixRouteToPathname('_marketing.pricing')).toBe('/pricing');
    expect(remixRouteToPathname('($lang).about')).toBe('/about');
  });

  it('strips the trailing underscore that opts out of layout nesting', () => {
    expect(remixRouteToPathname('blog_.stats')).toBe('/blog/stats');
  });
});

describe('generate (source routes)', () => {
  it('discovers flat-file and folder routes, skipping dynamic ones', async () => {
    const routes = join(projectDir, 'app', 'routes');
    mkdirSync(join(routes, 'contact'), { recursive: true });
    writeFileSync(join(routes, '_index.tsx'), 'export default function Home() {}');
    writeFileSync(join(routes, 'about.tsx'), 'export default function About() {}');
    writeFileSync(join(routes, 'blog.$slug.tsx'), 'export default function Post() {}');
    writeFileSync(join(routes, 'contact', 'route.tsx'), 'export default function Contact() {}');

    await generate({ title: 'My Site', url: 'https://mysite.com', widget: { enabled: false } });

    const llms = readFileSync(join(projectDir, 'public', 'llms.txt'), 'utf-8');
    expect(llms).toContain('/about');
    expect(llms).toContain('/contact');
    expect(llms).not.toContain('$slug');
  });
});

describe('postBuild', () => {
  const HTML = (title: string) =>
    `<!doctype html><html><head><title>${title}</title><meta name="description" content="Description for ${title} that is long enough."></head><body><h1>${title}</h1><p>Some real content about ${title}.</p></body></html>`;

  it('generates AEO files into build/client and merges prerendered content', async () => {
    const client = join(projectDir, 'build', 'client');
    mkdirSync(join(client, 'about'), { recursive: true });
    writeFileSync(join(client, 'index.html'), HTML('Home'));
    writeFileSync(join(client, 'about', 'index.html'), HTML('About'));

    const routes = join(projectDir, 'app', 'routes');
    mkdirSync(routes, { recursive: true });
    writeFileSync(join(routes, '_index.tsx'), 'export default function Home() {}');
    writeFileSync(join(routes, 'pricing.tsx'), 'export default function Pricing() {}');

    await postBuild({ title: 'My Site', url: 'https://mysite.com', widget: { enabled: false } });

    expect(existsSync(join(client, 'robots.txt'))).toBe(true);
    expect(existsSync(join(client, 'sitemap.xml'))).toBe(true);

    const llms = readFileSync(join(client, 'llms.txt'), 'utf-8');
    // prerendered pages contribute content, source-only routes still listed
    expect(llms).toContain('/about');
    expect(llms).toContain('/pricing');
  });

  it('falls back to public/ when there is no Vite build output', async () => {
    mkdirSync(join(projectDir, 'public'), { recursive: true });
    const routes = join(projectDir, 'app', 'routes');
    mkdirSync(routes, { recursive: true });
    writeFileSync(join(routes, '_index.tsx'), 'export default function Home() {}');

    await postBuild({ title: 'My Site', url: 'https://mysite.com', widget: { enabled: false } });

    expect(existsSync(join(projectDir, 'public', 'robots.txt'))).toBe(true);
  });

  it('config.pages entries override auto-scanned pages for the same pathname', async () => {
    const client = join(projectDir, 'build', 'client');
    mkdirSync(join(client, 'about'), { recursive: true });
    writeFileSync(join(client, 'about', 'index.html'), HTML('About'));

    await postBuild({
      title: 'My Site',
      url: 'https://mysite.com',
      widget: { enabled: false },
      pages: [{ pathname: '/about', title: 'About (Override)', description: 'Custom description.' }],
    });

    const llms = readFileSync(join(client, 'llms.txt'), 'utf-8');
    expect(llms).toContain('About (Override)');
    expect(llms).not.toContain('Description for About');
  });
});

describe('getWidgetScript', () => {
  it('returns a module script with the widget config', () => {
    const script = getWidgetScript({ title: 'My Site', url: 'https://mysite.com' });
    expect(script).toContain("import('aeo.js/widget')");
    expect(script).toContain('My Site');
  });

  it('returns empty string when the widget is disabled', () => {
    expect(getWidgetScript({ widget: { enabled: false } })).toBe('');
  });
});
