import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleMcpRequest } from './mcp-server';

function req(method: string, params?: Record<string, unknown>, id: number | undefined = 1) {
  return { jsonrpc: '2.0' as const, id, method, params };
}

describe('handleMcpRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('responds to initialize with server info and tools capability', async () => {
    const res = await handleMcpRequest(req('initialize', { protocolVersion: '2025-03-26' }));
    expect(res?.result).toMatchObject({
      protocolVersion: '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: { name: 'aeo.js' },
    });
  });

  it('responds to ping', async () => {
    const res = await handleMcpRequest(req('ping'));
    expect(res?.result).toEqual({});
  });

  it('lists the three tools with input schemas', async () => {
    const res = await handleMcpRequest(req('tools/list'));
    const tools = (res?.result as any).tools;
    expect(tools.map((t: any) => t.name)).toEqual(['audit_url', 'score_citability', 'generate_aeo_files']);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it('returns method-not-found for unknown requests with an id', async () => {
    const res = await handleMcpRequest(req('resources/list'));
    expect(res?.error?.code).toBe(-32601);
  });

  it('ignores notifications (no id)', async () => {
    const res = await handleMcpRequest({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(res).toBeNull();
  });

  it('scores citability via tools/call', async () => {
    const content = [
      'aeo.js generates llms.txt files for over 7 frameworks as of 2026.',
      'The audit produces a score from 0 to 100 across five categories.',
    ].join('\n\n');
    const res = await handleMcpRequest(req('tools/call', { name: 'score_citability', arguments: { content } }));
    const result = res?.result as any;
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toMatch(/Score: \d+\/100/);
  });

  it('returns a tool error for empty citability content', async () => {
    const res = await handleMcpRequest(req('tools/call', { name: 'score_citability', arguments: { content: '' } }));
    expect((res?.result as any).isError).toBe(true);
  });

  it('returns invalid-params error for unknown tools', async () => {
    const res = await handleMcpRequest(req('tools/call', { name: 'nope', arguments: {} }));
    expect(res?.error?.code).toBe(-32602);
  });

  it('audits a URL via tools/call with mocked fetch', async () => {
    const html =
      '<html><head><title>A Test Page Title</title></head><body><h1>Hi</h1><p>Welcome to the test page with some content.</p></body></html>';
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: url === 'https://a.com' || url === 'https://a.com/',
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => html,
    })));

    const res = await handleMcpRequest(req('tools/call', { name: 'audit_url', arguments: { url: 'a.com' } }));
    const result = res?.result as any;
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('GEO Readiness Score');
  });

  it('returns a tool error for invalid audit targets', async () => {
    const res = await handleMcpRequest(req('tools/call', { name: 'audit_url', arguments: { url: 'not a url' } }));
    expect((res?.result as any).isError).toBe(true);
  });
});
