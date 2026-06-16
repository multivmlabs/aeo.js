import { extractTextFromHtml, extractTitle, extractDescription, extractJsonLd } from './html-extract';

export interface BotAccessEntry {
  bot: string;
  company: string;
  purpose: string;
  allowed: boolean;
}

export interface DiscoveryResult {
  robotsTxt: { exists: boolean; content: string | null; hasAiDisallow: boolean };
  llmsTxt: { exists: boolean; contentLength: number; content?: string | null };
  llmsFullTxt: { exists: boolean; contentLength: number };
  sitemap: { exists: boolean; urls: string[] };
  aiIndex: { exists: boolean; content?: string | null };
  homepage: { html: string; url: string } | null;
  botAccess: BotAccessEntry[];
}

export interface CrawledPage {
  url: string;
  pathname: string;
  html: string;
  title?: string;
  description?: string;
  content?: string;
  jsonLd?: object[];
  ogTags?: Record<string, string>;
}

export interface RemoteCrawlOptions {
  /** Per-request timeout in milliseconds. Default: 12000. */
  timeoutMs?: number;
  /** Maximum inner pages to crawl beyond the homepage. Default: 10. */
  maxPages?: number;
  /** Concurrent page fetches. Default: 5. */
  concurrency?: number;
  /** User-Agent header for all requests. */
  userAgent?: string;
}

const DEFAULTS: Required<RemoteCrawlOptions> = {
  timeoutMs: 12000,
  maxPages: 10,
  concurrency: 5,
  userAgent: 'aeo.js (+https://aeojs.org)',
};

const MAX_URLS_FROM_SITEMAP = 20;
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

/**
 * Returns true if the URL resolves to a private/loopback/link-local address
 * that should never be fetched by the crawler (SSRF guard).
 */
export function isPrivateUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true; // unparseable → treat as private
  }

  const hostname = parsed.hostname.toLowerCase();

  // Hostname-based checks
  if (hostname === 'localhost') return true;

  // IPv6 loopback / ULA / link-local (string checks are sufficient here)
  if (hostname === '::1') return true;
  if (hostname === '[::1]') return true;
  // ULA fc00::/7 — starts with fc or fd
  if (/^\[?fc/i.test(hostname) || /^\[?fd/i.test(hostname)) return true;
  // Link-local fe80::/10
  if (/^\[?fe80/i.test(hostname)) return true;

  // Strip IPv6 brackets for numeric range checks
  const host = hostname.replace(/^\[|\]$/g, '');

  // IPv4 range checks
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const o1 = Number(ipv4[1]);
    const o2 = Number(ipv4[2]);
    if (o1 === 127) return true;                             // 127.x.x.x loopback
    if (o1 === 0) return true;                               // 0.0.0.0/8
    if (o1 === 10) return true;                              // 10.x.x.x
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;    // 172.16–31.x.x
    if (o1 === 192 && o2 === 168) return true;               // 192.168.x.x
    if (o1 === 169 && o2 === 254) return true;               // 169.254.x.x link-local / cloud metadata
  }

  return false;
}

/** Known AI crawlers checked against robots.txt. */
export const AI_BOTS: ReadonlyArray<Omit<BotAccessEntry, 'allowed'>> = [
  { bot: 'GPTBot', company: 'OpenAI', purpose: 'AI training & ChatGPT' },
  { bot: 'ChatGPT-User', company: 'OpenAI', purpose: 'ChatGPT browsing' },
  { bot: 'OAI-SearchBot', company: 'OpenAI', purpose: 'ChatGPT search' },
  { bot: 'ClaudeBot', company: 'Anthropic', purpose: 'Claude AI training' },
  { bot: 'Claude-User', company: 'Anthropic', purpose: 'Claude web access' },
  { bot: 'Claude-SearchBot', company: 'Anthropic', purpose: 'Claude search' },
  { bot: 'anthropic-ai', company: 'Anthropic', purpose: 'Claude training (legacy)' },
  { bot: 'Google-Extended', company: 'Google', purpose: 'Gemini AI training' },
  { bot: 'Gemini-Deep-Research', company: 'Google', purpose: 'Gemini Deep Research' },
  { bot: 'PerplexityBot', company: 'Perplexity', purpose: 'Perplexity search' },
  { bot: 'Perplexity-User', company: 'Perplexity', purpose: 'Perplexity browsing' },
  { bot: 'Bytespider', company: 'ByteDance', purpose: 'TikTok / Doubao AI' },
  { bot: 'CCBot', company: 'Common Crawl', purpose: 'Open training datasets' },
  { bot: 'Meta-ExternalAgent', company: 'Meta', purpose: 'Llama AI training' },
  { bot: 'FacebookBot', company: 'Meta', purpose: 'Meta link previews & AI' },
  { bot: 'Amazonbot', company: 'Amazon', purpose: 'Alexa & Rufus AI' },
  { bot: 'Applebot-Extended', company: 'Apple', purpose: 'Apple Intelligence' },
  { bot: 'cohere-ai', company: 'Cohere', purpose: 'Cohere AI training' },
  { bot: 'DuckAssistBot', company: 'DuckDuckGo', purpose: 'DuckAssist AI answers' },
  { bot: 'GrokBot', company: 'xAI', purpose: 'Grok AI training' },
  { bot: 'AI2Bot', company: 'Allen AI', purpose: 'Academic AI research' },
  { bot: 'YouBot', company: 'You.com', purpose: 'You.com AI search' },
  { bot: 'PetalBot', company: 'Huawei', purpose: 'Petal Search & AI' },
];

async function fetchWithTimeout(url: string, opts: Required<RemoteCrawlOptions>): Promise<Response | null> {
  // SSRF guard: reject requests to private / loopback / link-local addresses
  if (isPrivateUrl(url)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': opts.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string, opts: Required<RemoteCrawlOptions>): Promise<string | null> {
  const res = await fetchWithTimeout(url, opts);
  if (!res || !res.ok) return null;

  // Enforce a 1 MB body size cap to prevent unbounded memory consumption
  const contentLength = Number(res.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) return null;

  const text = await res.text();
  if (text.length > MAX_BODY_BYTES) return null;
  return text;
}

export function parseSitemapUrls(xml: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null && urls.length < MAX_URLS_FROM_SITEMAP) {
    const loc = match[1];
    if (loc.startsWith('http')) {
      urls.push(loc);
    } else {
      try {
        urls.push(new URL(loc, baseUrl).href);
      } catch {
        // skip malformed <loc> entries
      }
    }
  }
  return urls;
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/gi;
  const origin = new URL(baseUrl).origin;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith('/') && !href.startsWith('//')) {
      links.push(origin + href);
    } else if (href.startsWith(origin)) {
      links.push(href);
    }
  }
  const seen = new Set<string>();
  return links
    .filter((link) => {
      const clean = link.split('#')[0].split('?')[0];
      if (seen.has(clean)) return false;
      if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip)$/i.test(clean)) return false;
      seen.add(clean);
      return true;
    })
    .slice(0, 5);
}

export function extractOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const ogRegex = /<meta\s+(?:property|name)=["'](og:[^"']+)["']\s+content=["']([^"']*)["']/gi;
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    tags[match[1]] = match[2];
  }
  // Also try reversed attribute order
  const ogRegex2 = /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["'](og:[^"']+)["']/gi;
  while ((match = ogRegex2.exec(html)) !== null) {
    tags[match[2]] = match[1];
  }
  return tags;
}

/**
 * Parse robots.txt into an access matrix for known AI crawlers.
 * A missing robots.txt means every bot is allowed.
 */
export function parseRobotsTxtBotAccess(robotsTxt: string | null): BotAccessEntry[] {
  if (!robotsTxt) {
    return AI_BOTS.map((b) => ({ ...b, allowed: true }));
  }

  const lines = robotsTxt.split('\n').map((l) => l.trim());

  const rules: Map<string, { allow: string[]; disallow: string[] }> = new Map();
  let currentAgents: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || line === '') {
      if (line === '') currentAgents = [];
      continue;
    }

    const uaMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (uaMatch) {
      const agent = uaMatch[1].trim().toLowerCase();
      currentAgents.push(agent);
      if (!rules.has(agent)) rules.set(agent, { allow: [], disallow: [] });
      continue;
    }

    const disallowMatch = line.match(/^disallow:\s*(.*)$/i);
    if (disallowMatch && currentAgents.length > 0) {
      const path = disallowMatch[1].trim();
      for (const agent of currentAgents) {
        rules.get(agent)!.disallow.push(path);
      }
      continue;
    }

    const allowMatch = line.match(/^allow:\s*(.*)$/i);
    if (allowMatch && currentAgents.length > 0) {
      const path = allowMatch[1].trim();
      for (const agent of currentAgents) {
        rules.get(agent)!.allow.push(path);
      }
    }
  }

  const wildcardRules = rules.get('*');
  const wildcardBlocks = wildcardRules?.disallow.includes('/') ?? false;
  const wildcardAllowsRoot = wildcardRules?.allow.some((a) => a === '/' || a === '/*') ?? false;

  return AI_BOTS.map((botDef) => {
    const botRules = rules.get(botDef.bot.toLowerCase());

    let allowed: boolean;
    if (botRules) {
      const hasDisallowAll = botRules.disallow.includes('/');
      const hasExplicitAllow = botRules.allow.some((a) => a === '/' || a === '/*');
      if (hasDisallowAll && !hasExplicitAllow) {
        allowed = false;
      } else {
        // Explicit allow, partial disallow, or empty disallow all leave the bot allowed
        allowed = true;
      }
    } else {
      allowed = !wildcardBlocks || wildcardAllowsRoot;
    }

    return { ...botDef, allowed };
  });
}

/**
 * Fetch a site's AEO discovery surface: robots.txt, llms.txt, llms-full.txt,
 * sitemap.xml, ai-index.json and the homepage HTML, plus the AI bot access matrix.
 */
export async function discover(targetUrl: string, options: RemoteCrawlOptions = {}): Promise<DiscoveryResult> {
  const opts = { ...DEFAULTS, ...options };
  const origin = new URL(targetUrl).origin;

  const [robotsText, llmsText, llmsFullText, sitemapText, aiIndexRes, homepageHtml] = await Promise.all([
    fetchText(`${origin}/robots.txt`, opts),
    fetchText(`${origin}/llms.txt`, opts),
    fetchText(`${origin}/llms-full.txt`, opts),
    fetchText(`${origin}/sitemap.xml`, opts),
    fetchWithTimeout(`${origin}/ai-index.json`, opts),
    fetchText(targetUrl, opts),
  ]);

  const hasAiDisallow = robotsText
    ? /disallow:\s*\/\s*$/im.test(robotsText) || /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/im.test(robotsText)
    : false;

  return {
    robotsTxt: {
      exists: robotsText !== null,
      content: robotsText,
      hasAiDisallow,
    },
    llmsTxt: {
      exists: llmsText !== null,
      contentLength: llmsText?.length ?? 0,
      content: llmsText,
    },
    llmsFullTxt: {
      exists: llmsFullText !== null,
      contentLength: llmsFullText?.length ?? 0,
    },
    sitemap: {
      exists: sitemapText !== null,
      urls: sitemapText ? parseSitemapUrls(sitemapText, origin) : [],
    },
    aiIndex: {
      exists: Boolean(
        aiIndexRes?.ok && (aiIndexRes.headers.get('content-type') ?? '').toLowerCase().includes('application/json')
      ),
      content: aiIndexRes?.ok ? await aiIndexRes.text().catch(() => null) : null,
    },
    homepage: homepageHtml ? { html: homepageHtml, url: targetUrl } : null,
    botAccess: parseRobotsTxtBotAccess(robotsText),
  };
}

/**
 * Crawl the homepage plus up to `maxPages` inner pages, preferring sitemap URLs
 * and falling back to homepage links.
 */
export async function crawlPages(
  discovery: DiscoveryResult,
  targetUrl: string,
  options: RemoteCrawlOptions = {}
): Promise<CrawledPage[]> {
  const opts = { ...DEFAULTS, ...options };
  const pages: CrawledPage[] = [];
  const origin = new URL(targetUrl).origin;

  if (discovery.homepage) {
    pages.push(buildCrawledPage(discovery.homepage.url, discovery.homepage.html));
  }

  let innerUrls: string[] = [];
  if (discovery.sitemap.urls.length > 0) {
    // Remap sitemap URLs to the target origin if domains differ (e.g. www vs apex)
    innerUrls = discovery.sitemap.urls
      .map((u) => {
        try {
          const parsed = new URL(u);
          return parsed.origin !== origin ? origin + parsed.pathname : u;
        } catch {
          return u;
        }
      })
      .filter((u) => u !== targetUrl && u !== targetUrl + '/' && u !== origin && u !== origin + '/')
      .slice(0, opts.maxPages);
  }

  if (innerUrls.length === 0 && discovery.homepage) {
    innerUrls = extractLinks(discovery.homepage.html, origin).filter((u) => u !== targetUrl && u !== targetUrl + '/');
  }

  for (let i = 0; i < innerUrls.length; i += opts.concurrency) {
    const batch = innerUrls.slice(i, i + opts.concurrency);
    const results = await Promise.all(
      batch.map(async (url) => {
        const html = await fetchText(url, opts);
        if (!html) return null;
        return buildCrawledPage(url, html);
      })
    );
    for (const page of results) {
      if (page) pages.push(page);
    }
  }

  return pages;
}

function buildCrawledPage(url: string, html: string): CrawledPage {
  return {
    url,
    pathname: new URL(url).pathname,
    html,
    title: extractTitle(html) ?? undefined,
    description: extractDescription(html) ?? undefined,
    content: extractTextFromHtml(html),
    jsonLd: extractJsonLd(html),
    ogTags: extractOgTags(html),
  };
}
