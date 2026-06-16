import { discover, crawlPages } from './remote-crawl';
import { buildRemoteReport, formatRemoteReport } from './remote-audit';
import { scorePageCitability, formatPageCitability } from './citability';
import { generateAEOFiles } from './generate';
import { resolveConfig } from './utils';
import { resolve, isAbsolute } from 'path';
import { VERSION } from '../index';

/**
 * Minimal MCP (Model Context Protocol) server over stdio.
 * Implements the subset agents need — initialize, tools/list, tools/call,
 * ping — as plain JSON-RPC, so no SDK dependency is required.
 */

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

const TOOLS = [
  {
    name: 'audit_url',
    description:
      'Audit any live website for AI answer-engine readiness (AEO/GEO). Crawls the site (robots.txt, llms.txt, sitemap, homepage + up to 10 inner pages) and returns a 0-100 GEO readiness score across 5 categories, an AI crawler access matrix (GPTBot, ClaudeBot, PerplexityBot, ...), content citability scores, and the top recommended fixes.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The site URL or bare domain to audit, e.g. "example.com"' },
        json: {
          type: 'boolean',
          description: 'Return the full structured report as JSON instead of formatted text. Default false.',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'score_citability',
    description:
      'Score a piece of content (markdown or plain text) for AI citability: how likely AI answer engines are to extract and cite it. Returns a 0-100 score across 4 dimensions (answer clarity, self-containment, statistical density, structure) with concrete improvement hints. Use while drafting or editing content.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The content to score (markdown or plain text)' },
        title: { type: 'string', description: 'Optional page title' },
        description: { type: 'string', description: 'Optional meta description' },
      },
      required: ['content'],
    },
  },
  {
    name: 'generate_aeo_files',
    description:
      'Generate AEO files (robots.txt with AI crawler directives, llms.txt, llms-full.txt, sitemap.xml, ai-index.json, schema.json, per-page markdown) into a directory of the current project. Run from the project root after a build.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Site title' },
        url: { type: 'string', description: 'Canonical site URL, e.g. "https://mysite.com"' },
        description: { type: 'string', description: 'Site description' },
        outDir: { type: 'string', description: 'Output directory (default: auto-detected build output)' },
      },
      required: ['title', 'url'],
    },
  },
];

function normalizeUrl(input: string): string | null {
  let candidate = input.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(candidate)) return null;
    candidate = 'https://' + candidate;
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

function textResult(text: string, isError = false) {
  return { content: [{ type: 'text', text }], isError };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'audit_url': {
      const target = typeof args.url === 'string' ? normalizeUrl(args.url) : null;
      if (!target) return textResult(`"${args.url}" is not a valid URL or domain.`, true);

      const discovery = await discover(target);
      if (!discovery.homepage) {
        return textResult(`Could not reach ${target} — the site may be down or blocking requests.`, true);
      }
      const pages = await crawlPages(discovery, target);
      const report = buildRemoteReport(target, discovery, pages);

      if (args.json) {
        const slim = {
          ...report,
          discovery: { ...report.discovery, homepage: { url: target } },
          pages: report.pages.map(({ html: _html, ...page }) => page),
        };
        return textResult(JSON.stringify(slim, null, 2));
      }
      return textResult(formatRemoteReport(report));
    }

    case 'score_citability': {
      if (typeof args.content !== 'string' || args.content.length === 0) {
        return textResult('The "content" argument is required and must be a non-empty string.', true);
      }
      const result = scorePageCitability({
        pathname: '/',
        title: typeof args.title === 'string' ? args.title : undefined,
        description: typeof args.description === 'string' ? args.description : undefined,
        content: args.content,
      });
      return textResult(formatPageCitability(result));
    }

    case 'generate_aeo_files': {
      if (typeof args.title !== 'string' || typeof args.url !== 'string') {
        return textResult('Both "title" and "url" arguments are required.', true);
      }
      const canonicalUrl = normalizeUrl(args.url);
      if (!canonicalUrl) {
        return textResult(`"${args.url}" is not a valid URL or domain.`, true);
      }
      let safeOutDir: string | undefined;
      if (typeof args.outDir === 'string') {
        const cwd = process.cwd();
        const resolved = isAbsolute(args.outDir) ? args.outDir : resolve(cwd, args.outDir);
        if (!resolved.startsWith(cwd + '/') && resolved !== cwd) {
          return textResult('outDir must be inside the current working directory.', true);
        }
        safeOutDir = resolved;
      }
      const config = resolveConfig({
        title: args.title,
        url: canonicalUrl,
        description: typeof args.description === 'string' ? args.description : undefined,
        outDir: safeOutDir,
      });
      const result = await generateAEOFiles(config);
      const lines = [
        `Generated ${result.files.length} file(s) in ${config.outDir}:`,
        ...result.files.map((f) => `  - ${f}`),
      ];
      if (result.errors.length > 0) {
        lines.push('', `Errors:`, ...result.errors.map((e) => `  - ${e}`));
      }
      return textResult(lines.join('\n'), result.errors.length > 0);
    }

    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 });
  }
}

/**
 * Handle a single JSON-RPC request. Returns null for notifications
 * (requests without an id), which expect no response.
 */
export async function handleMcpRequest(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = request.id ?? null;
  const isNotification = request.id === undefined;

  try {
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2025-03-26',
            capabilities: { tools: {} },
            serverInfo: { name: 'aeo.js', version: VERSION },
          },
        };

      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };

      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: TOOLS } };

      case 'tools/call': {
        const name = request.params?.name as string;
        const args = (request.params?.arguments as Record<string, unknown>) ?? {};
        const result = await callTool(name, args);
        return { jsonrpc: '2.0', id, result };
      }

      default:
        if (isNotification) return null; // notifications/initialized etc.
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${request.method}` },
        };
    }
  } catch (error: any) {
    if (isNotification) return null;
    return {
      jsonrpc: '2.0',
      id,
      error: { code: typeof error?.code === 'number' ? error.code : -32603, message: error?.message ?? 'Internal error' },
    };
  }
}

/**
 * Run the MCP server on stdio: newline-delimited JSON-RPC on stdin/stdout.
 * Logs go to stderr so they never corrupt the protocol stream.
 */
export function runMcpStdio(): void {
  console.error(`[aeo.js] MCP server v${VERSION} listening on stdio`);

  let buffer = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let newline: number;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;

      let request: JsonRpcRequest;
      try {
        request = JSON.parse(line);
      } catch {
        process.stdout.write(
          JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n'
        );
        continue;
      }

      handleMcpRequest(request)
        .then((response) => {
          if (response) process.stdout.write(JSON.stringify(response) + '\n');
        })
        .catch((err: NodeJS.ErrnoException) => {
          // Swallow all stdout write errors — EPIPE means the client disconnected,
          // EBADF/ENOTSOCK can occur on unusual stdio setups. Log to stderr so
          // the error is visible without crashing the long-running server process.
          process.stderr.write(`[aeo.js mcp] stdout write error: ${err.code ?? err.message}\n`);
        });
    }
  });

  process.stdin.on('end', () => process.exit(0));
}
