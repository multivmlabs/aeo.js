import { fileURLToPath } from 'url';
import { describe, expect, it, vi } from 'vitest';
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
});
