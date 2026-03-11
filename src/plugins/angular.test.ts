import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postBuild, generate, getWidgetScript } from './angular';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'fs';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  readFileSync: vi.fn().mockReturnValue(''),
  statSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('../core/generate', () => ({
  generateAEOFiles: vi.fn().mockResolvedValue({ files: ['robots.txt'], errors: [] }),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockStatSync = vi.mocked(statSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

describe('Angular plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReaddirSync.mockReturnValue([]);
  });

  describe('getWidgetScript', () => {
    it('should return script tag with widget config', () => {
      const script = getWidgetScript({
        title: 'My App',
        url: 'https://myapp.com',
      });

      expect(script).toContain('<script type="module">');
      expect(script).toContain("import('aeo.js/widget')");
      expect(script).toContain('AeoWidget');
      expect(script).toContain('My App');
      expect(script).toContain('https://myapp.com');
    });

    it('should return empty string when widget is disabled', () => {
      const script = getWidgetScript({
        widget: { enabled: false },
      });

      expect(script).toBe('');
    });
  });

  describe('postBuild', () => {
    it('should scan build output and generate files', async () => {
      const { generateAEOFiles } = await import('../core/generate');

      // angular.json exists with outputPath
      mockExistsSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('angular.json')) return true;
        if (path.includes('dist/my-app/browser')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('angular.json')) {
          return JSON.stringify({
            projects: {
              'my-app': {
                architect: {
                  build: {
                    options: { outputPath: 'dist/my-app' },
                  },
                },
              },
            },
          });
        }
        return '';
      });

      mockReaddirSync.mockReturnValue([]);

      await postBuild({ title: 'My App', url: 'https://myapp.com' });

      expect(generateAEOFiles).toHaveBeenCalled();
    });

    it('should inject widget into index.html when injectWidget is not false', async () => {
      mockExistsSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('angular.json')) return false;
        if (path.endsWith('index.html')) return true;
        if (path.includes('dist')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('index.html')) {
          return '<html><body><app-root></app-root></body></html>';
        }
        return '';
      });

      mockReaddirSync.mockReturnValue([]);

      await postBuild({
        title: 'My App',
        url: 'https://myapp.com',
        outDir: '/project/dist',
      });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        expect.stringContaining('aeo.js/widget'),
        'utf-8',
      );
    });

    it('should not inject widget when already present', async () => {
      mockExistsSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('index.html')) return true;
        if (path.includes('dist')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('index.html')) {
          return '<html><body><script>aeo.js/widget</script></body></html>';
        }
        return '';
      });

      mockReaddirSync.mockReturnValue([]);

      await postBuild({
        title: 'My App',
        url: 'https://myapp.com',
        outDir: '/project/dist',
      });

      // writeFileSync should NOT be called for index.html since widget is already present
      const indexWriteCalls = mockWriteFileSync.mock.calls.filter(
        call => call[0].toString().endsWith('index.html'),
      );
      expect(indexWriteCalls).toHaveLength(0);
    });
  });

  describe('generate', () => {
    it('should scan Angular routes from source', async () => {
      const { generateAEOFiles } = await import('../core/generate');

      mockExistsSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('src/app')) return true;
        return false;
      });

      mockReaddirSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('src/app')) return ['about', 'contact', 'app.routes.ts'] as any;
        if (path.endsWith('about')) return ['about.component.ts'] as any;
        if (path.endsWith('contact')) return ['contact.component.ts'] as any;
        return [];
      });

      mockStatSync.mockImplementation((p) => {
        const path = p.toString();
        const isDir = path.endsWith('about') || path.endsWith('contact') || path.endsWith('src/app');
        return {
          isFile: () => !isDir,
          isDirectory: () => isDir,
        } as any;
      });

      mockReadFileSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('app.routes.ts')) {
          return `export const routes: Routes = [
            { path: '', component: HomeComponent },
            { path: 'about', component: AboutComponent },
            { path: 'contact', component: ContactComponent },
          ];`;
        }
        return '';
      });

      await generate({ title: 'My App', url: 'https://myapp.com' });

      expect(generateAEOFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          pages: expect.arrayContaining([
            expect.objectContaining({ pathname: '/' }),
            expect.objectContaining({ pathname: '/about' }),
            expect.objectContaining({ pathname: '/contact' }),
          ]),
        }),
      );
    });

    it('should always include root page', async () => {
      const { generateAEOFiles } = await import('../core/generate');

      mockExistsSync.mockReturnValue(false);

      await generate({ title: 'My App', url: 'https://myapp.com' });

      expect(generateAEOFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          pages: expect.arrayContaining([
            expect.objectContaining({ pathname: '/' }),
          ]),
        }),
      );
    });
  });

  describe('detectAngularOutputDir', () => {
    it('should read outputPath from angular.json', async () => {
      const { generateAEOFiles } = await import('../core/generate');

      mockExistsSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('angular.json')) return true;
        // The detected output dir should contain 'browser' for v17+
        if (path.includes('my-app') && path.includes('browser')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p) => {
        const path = p.toString();
        if (path.endsWith('angular.json')) {
          return JSON.stringify({
            projects: {
              'my-app': {
                architect: {
                  build: {
                    options: {
                      outputPath: { base: 'dist/my-app' },
                    },
                  },
                },
              },
            },
          });
        }
        return '';
      });

      mockReaddirSync.mockReturnValue([]);

      await postBuild({ title: 'My App', url: 'https://myapp.com' });

      // Should have used the detected output dir from angular.json
      expect(generateAEOFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          outDir: expect.stringContaining('my-app'),
        }),
      );
    });
  });
});
