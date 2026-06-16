import { fileURLToPath } from 'url';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { aeoAstroIntegration } from './astro';

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('fs', () => fsMocks);

describe('aeoAstroIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses native filesystem paths for Astro file URLs in dev', () => {
    fsMocks.existsSync.mockReturnValue(false);

    const publicDir = new URL('file:///C:/mock/project/public');
    const outDir = new URL('file:///C:/mock/project/dist');
    const integration = aeoAstroIntegration({ widget: { enabled: false } });

    integration.hooks['astro:config:setup']({
      config: { publicDir, outDir },
      command: 'dev',
    });

    expect(fsMocks.mkdirSync).toHaveBeenCalledWith(fileURLToPath(publicDir), { recursive: true });
  });

  it('uses native filesystem paths for Astro file URLs in build (astro:config:setup)', () => {
    fsMocks.existsSync.mockReturnValue(false);

    const publicDir = new URL('file:///C:/mock/project/public');
    const outDir = new URL('file:///C:/mock/project/dist');
    const integration = aeoAstroIntegration({ widget: { enabled: false } });

    // In build mode, outDir is used (not publicDir for mkdirSync)
    // The key thing is that toFileSystemPath is called on outDir without throwing
    expect(() => {
      integration.hooks['astro:config:setup']({
        config: { publicDir, outDir },
        command: 'build',
      });
    }).not.toThrow();
  });

  it('uses native filesystem paths for Windows file URLs in astro:build:done hook', async () => {
    // Simulate an empty build output directory so scanBuiltPages returns no pages
    fsMocks.readdirSync.mockReturnValue([]);
    fsMocks.existsSync.mockReturnValue(false);

    const publicDir = new URL('file:///C:/mock/project/public');
    const outDir = new URL('file:///C:/mock/project/dist');
    const dir = new URL('file:///C:/mock/project/dist/');
    const integration = aeoAstroIntegration({ url: 'https://example.com', widget: { enabled: false } });

    const logger = {
      fork: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    };

    // astro:build:done uses astroConfig.site which is set during astro:config:setup
    integration.hooks['astro:config:setup']({
      config: { publicDir, outDir, site: 'https://example.com' },
      command: 'build',
    });

    // Should resolve the Windows file URL to a filesystem path without throwing
    await expect(
      integration.hooks['astro:build:done']({ dir, logger })
    ).resolves.not.toThrow();

    // readdirSync should have been called with the converted Windows path
    expect(fsMocks.readdirSync).toHaveBeenCalledWith(fileURLToPath(dir));
  });

  it('toFileSystemPath throws a descriptive error for non-file: URLs', () => {
    // Access the integration to trigger the module load; the guard is tested via
    // astro:config:setup with a non-file URL object passed as outDir
    const integration = aeoAstroIntegration({ widget: { enabled: false } });

    const nonFileUrl = new URL('https://example.com/dist');
    expect(() => {
      integration.hooks['astro:config:setup']({
        config: { publicDir: nonFileUrl, outDir: nonFileUrl },
        command: 'build',
      });
    }).toThrow(/expected a file: URL/);
  });
});
