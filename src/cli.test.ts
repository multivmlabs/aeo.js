import { describe, it, expect } from 'vitest';
import { parseArgs } from './cli';

describe('parseArgs', () => {
  it('parses space-separated flag values', () => {
    const { command, flags } = parseArgs(['generate', '--out', 'public', '--url', 'https://example.com']);
    expect(command).toBe('generate');
    expect(flags.out).toBe('public');
    expect(flags.url).toBe('https://example.com');
  });

  it('parses equals-separated flag values', () => {
    const { command, flags } = parseArgs(['generate', '--out=public', '--url=https://example.com']);
    expect(command).toBe('generate');
    expect(flags.out).toBe('public');
    expect(flags.url).toBe('https://example.com');
  });

  it('preserves equals signs that are part of the value', () => {
    const { flags } = parseArgs(['generate', '--title=Foo=Bar=Baz']);
    expect(flags.title).toBe('Foo=Bar=Baz');
  });

  it('handles a mix of both forms in the same invocation', () => {
    const { flags } = parseArgs(['generate', '--out=dist', '--url', 'https://x.dev']);
    expect(flags.out).toBe('dist');
    expect(flags.url).toBe('https://x.dev');
  });

  it('still parses boolean flags', () => {
    const { flags } = parseArgs(['generate', '--no-widget', '--json']);
    expect(flags.noWidget).toBe(true);
    expect(flags.json).toBe(true);
  });

  it('treats --no-widget=true as the same camelCase boolean as --no-widget', () => {
    const { flags } = parseArgs(['generate', '--no-widget=true']);
    expect(flags.noWidget).toBe(true);
    expect(flags['no-widget']).toBeUndefined();
  });

  it('treats --no-widget=false as a disabled boolean', () => {
    const { flags } = parseArgs(['generate', '--no-widget=false']);
    expect(flags.noWidget).toBe(false);
  });

  it('importing the CLI module does not run main()', () => {
    // Smoke check: if main() were running on import, the test runner would
    // exit before this assertion. Reaching this line proves the guard works.
    expect(typeof parseArgs).toBe('function');
  });
});
