import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseRobotsTxtBotAccess,
  parseSitemapUrls,
  extractLinks,
  extractOgTags,
  discover,
  crawlPages,
  isPrivateUrl,
  AI_BOTS,
} from './remote-crawl';

describe('parseRobotsTxtBotAccess', () => {
  it('allows all bots when robots.txt is missing', () => {
    const access = parseRobotsTxtBotAccess(null);
    expect(access).toHaveLength(AI_BOTS.length);
    expect(access.every((b) => b.allowed)).toBe(true);
  });

  it('blocks all bots under a wildcard disallow /', () => {
    const access = parseRobotsTxtBotAccess('User-agent: *\nDisallow: /\n');
    expect(access.every((b) => !b.allowed)).toBe(true);
  });

  it('blocks a specifically disallowed bot but not others', () => {
    const robots = 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:\n';
    const access = parseRobotsTxtBotAccess(robots);
    expect(access.find((b) => b.bot === 'GPTBot')?.allowed).toBe(false);
    expect(access.find((b) => b.bot === 'ClaudeBot')?.allowed).toBe(true);
  });

  it('treats partial disallow as still accessible', () => {
    const robots = 'User-agent: ClaudeBot\nDisallow: /admin\n';
    const access = parseRobotsTxtBotAccess(robots);
    expect(access.find((b) => b.bot === 'ClaudeBot')?.allowed).toBe(true);
  });

  it('lets a specific allow override wildcard block', () => {
    const robots = 'User-agent: *\nDisallow: /\n\nUser-agent: PerplexityBot\nAllow: /\n';
    const access = parseRobotsTxtBotAccess(robots);
    expect(access.find((b) => b.bot === 'PerplexityBot')?.allowed).toBe(true);
    expect(access.find((b) => b.bot === 'GPTBot')?.allowed).toBe(false);
  });

  it('handles grouped user-agents sharing rules', () => {
    const robots = 'User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /\n';
    const access = parseRobotsTxtBotAccess(robots);
    expect(access.find((b) => b.bot === 'GPTBot')?.allowed).toBe(false);
    expect(access.find((b) => b.bot === 'ClaudeBot')?.allowed).toBe(false);
  });
});

describe('parseSitemapUrls', () => {
  it('extracts absolute and resolves relative loc entries', () => {
    const xml = '<urlset><url><loc>https://a.com/x</loc></url><url><loc>/y</loc></url></urlset>';
    expect(parseSitemapUrls(xml, 'https://a.com')).toEqual(['https://a.com/x', 'https://a.com/y']);
  });

  it('caps at 20 urls', () => {
    const xml = Array.from({ length: 30 }, (_, i) => `<loc>https://a.com/p${i}</loc>`).join('');
    expect(parseSitemapUrls(xml, 'https://a.com')).toHaveLength(20);
  });
});

describe('extractLinks', () => {
  it('keeps same-origin links, drops assets and duplicates, caps at 5', () => {
    const html = `
      <a href="/docs">d</a>
      <a href="/docs">dup</a>
      <a href="https://a.com/about">a</a>
      <a href="https://other.com/x">ext</a>
      <a href="/style.css">css</a>
      <a href="/p1">1</a><a href="/p2">2</a><a href="/p3">3</a><a href="/p4">4</a>
    `;
    const links = extractLinks(html, 'https://a.com');
    expect(links).toHaveLength(5);
    expect(links).toContain('https://a.com/docs');
    expect(links).toContain('https://a.com/about');
    expect(links.some((l) => l.includes('other.com'))).toBe(false);
    expect(links.some((l) => l.endsWith('.css'))).toBe(false);
  });
});

describe('extractOgTags', () => {
  it('parses both attribute orders', () => {
    const html = `
      <meta property="og:title" content="Hello">
      <meta content="World" property="og:description">
    `;
    expect(extractOgTags(html)).toEqual({ 'og:title': 'Hello', 'og:description': 'World' });
  });
});

describe('isPrivateUrl', () => {
  it('blocks loopback 127.x.x.x', () => {
    expect(isPrivateUrl('http://127.0.0.1/')).toBe(true);
    expect(isPrivateUrl('http://127.1.2.3/')).toBe(true);
  });

  it('blocks 0.0.0.0', () => {
    expect(isPrivateUrl('http://0.0.0.0/')).toBe(true);
  });

  it('blocks 10.x.x.x', () => {
    expect(isPrivateUrl('http://10.0.0.1/')).toBe(true);
    expect(isPrivateUrl('http://10.255.255.255/')).toBe(true);
  });

  it('blocks 172.16–31.x.x', () => {
    expect(isPrivateUrl('http://172.16.0.1/')).toBe(true);
    expect(isPrivateUrl('http://172.31.255.255/')).toBe(true);
    expect(isPrivateUrl('http://172.15.0.1/')).toBe(false);
    expect(isPrivateUrl('http://172.32.0.1/')).toBe(false);
  });

  it('blocks 192.168.x.x', () => {
    expect(isPrivateUrl('http://192.168.1.1/')).toBe(true);
  });

  it('blocks link-local and cloud metadata 169.254.x.x', () => {
    expect(isPrivateUrl('http://169.254.1.1/')).toBe(true);
    expect(isPrivateUrl('http://169.254.169.254/latest/meta-data/')).toBe(true);
  });

  it('blocks localhost hostname', () => {
    expect(isPrivateUrl('http://localhost/')).toBe(true);
    expect(isPrivateUrl('http://localhost:8080/path')).toBe(true);
  });

  it('blocks IPv6 loopback', () => {
    expect(isPrivateUrl('http://[::1]/')).toBe(true);
  });

  it('allows public IPs', () => {
    expect(isPrivateUrl('https://example.com/')).toBe(false);
    expect(isPrivateUrl('https://8.8.8.8/')).toBe(false);
    expect(isPrivateUrl('https://93.184.216.34/')).toBe(false);
  });
});

describe('discover + crawlPages (mocked fetch)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(routes: Record<string, { body: string; contentType?: string } | null>) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const route = routes[url];
      if (!route) return { ok: false, status: 404, headers: new Headers(), text: async () => '' };
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': route.contentType ?? 'text/html' }),
        text: async () => route.body,
      };
    }));
  }

  it('discovers AEO files and crawls sitemap pages', async () => {
    const home = '<html><head><title>Home Page Title</title></head><body><p>Welcome to the home page.</p></body></html>';
    const inner = '<html><head><title>Docs</title></head><body><h1>Docs</h1><p>Documentation content.</p></body></html>';
    stubFetch({
      'https://a.com/robots.txt': { body: 'User-agent: *\nDisallow:\n' },
      'https://a.com/llms.txt': { body: '# A site\n' },
      'https://a.com/sitemap.xml': { body: '<urlset><loc>https://a.com/docs</loc></urlset>' },
      'https://a.com/ai-index.json': { body: '{}', contentType: 'application/json' },
      'https://a.com': { body: home },
      'https://a.com/docs': { body: inner },
    });

    const discovery = await discover('https://a.com');
    expect(discovery.robotsTxt.exists).toBe(true);
    expect(discovery.llmsTxt.exists).toBe(true);
    expect(discovery.llmsFullTxt.exists).toBe(false);
    expect(discovery.sitemap.urls).toEqual(['https://a.com/docs']);
    expect(discovery.aiIndex.exists).toBe(true);
    expect(discovery.homepage?.url).toBe('https://a.com');

    const pages = await crawlPages(discovery, 'https://a.com');
    expect(pages).toHaveLength(2);
    expect(pages[0].pathname).toBe('/');
    expect(pages[0].title).toBe('Home Page Title');
    expect(pages[1].pathname).toBe('/docs');
    expect(pages[1].content).toContain('Documentation content');
  });

  it('falls back to homepage links when sitemap is missing', async () => {
    const home = '<html><body><a href="/about">About</a><p>Home</p></body></html>';
    stubFetch({
      'https://a.com': { body: home },
      'https://a.com/about': { body: '<html><body><p>About us page.</p></body></html>' },
    });

    const discovery = await discover('https://a.com');
    expect(discovery.sitemap.exists).toBe(false);

    const pages = await crawlPages(discovery, 'https://a.com');
    expect(pages.map((p) => p.pathname)).toEqual(['/', '/about']);
  });

  it('returns an empty result for an unreachable site', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));

    const discovery = await discover('https://down.example');
    expect(discovery.homepage).toBeNull();
    expect(discovery.robotsTxt.exists).toBe(false);
    expect(discovery.botAccess.every((b) => b.allowed)).toBe(true);

    const pages = await crawlPages(discovery, 'https://down.example');
    expect(pages).toHaveLength(0);
  });

  it('returns null (no homepage) when response body exceeds 1 MB', async () => {
    const oversizedBody = 'x'.repeat(1024 * 1024 + 1);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => oversizedBody,
    })));

    const discovery = await discover('https://big.example');
    // fetchText returns null for oversized bodies, so homepage should be null
    expect(discovery.homepage).toBeNull();
  });

  it('returns null when Content-Length header exceeds 1 MB', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'text/html',
        'content-length': String(1024 * 1024 + 1),
      }),
      text: async () => '<html></html>',
    })));

    const discovery = await discover('https://big-header.example');
    expect(discovery.homepage).toBeNull();
  });

  it('rejects private IP URLs — 192.168.x.x returns no pages', async () => {
    // fetch should never be called for private IPs
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const discovery = await discover('http://192.168.1.1/');
    expect(discovery.homepage).toBeNull();
    // fetch should not have been invoked for any of the discovery endpoints
    const calledUrls: string[] = fetchMock.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calledUrls.every((u) => !u.includes('192.168.1.1'))).toBe(true);
  });

  it('rejects cloud metadata endpoint 169.254.169.254', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const discovery = await discover('http://169.254.169.254/latest/meta-data/');
    expect(discovery.homepage).toBeNull();
    const calledUrls: string[] = fetchMock.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calledUrls.every((u) => !u.includes('169.254.169.254'))).toBe(true);
  });
});
