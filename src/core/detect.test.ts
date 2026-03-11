import { describe, it, expect, vi } from 'vitest';
import { detectFramework } from './detect';
import * as utils from './utils';

vi.mock('./utils');

describe('detectFramework', () => {
  it('should detect Next.js project', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      dependencies: { next: '13.0.0' },
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'next',
      contentDir: 'app',
      outDir: 'out',
    });
  });

  it('should detect Vite project', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      devDependencies: { vite: '4.0.0' },
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'vite',
      contentDir: 'src',
      outDir: 'dist',
    });
  });

  it('should detect Astro project', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      dependencies: { astro: '3.0.0' },
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'astro',
      contentDir: 'src/content',
      outDir: 'dist',
    });
  });

  it('should detect Nuxt project', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      devDependencies: { nuxt: '3.0.0' },
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'nuxt',
      contentDir: 'content',
      outDir: '.output/public',
    });
  });

  it('should detect Remix project', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      devDependencies: { '@remix-run/dev': '2.0.0' },
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'remix',
      contentDir: 'app',
      outDir: 'build/client',
    });
  });

  it('should detect SvelteKit project', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      devDependencies: { '@sveltejs/kit': '1.0.0' },
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'sveltekit',
      contentDir: 'src',
      outDir: 'build',
    });
  });

  it('should detect Angular project', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      dependencies: { '@angular/core': '17.0.0' },
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'angular',
      contentDir: 'src',
      outDir: 'dist',
    });
  });

  it('should detect Docusaurus project', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      dependencies: { '@docusaurus/core': '3.0.0' },
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'docusaurus',
      contentDir: 'docs',
      outDir: 'build',
    });
  });

  it('should return unknown when no framework is detected', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      dependencies: {},
      devDependencies: {},
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'unknown',
      contentDir: 'src',
      outDir: 'dist',
    });
  });

  it('should handle combined dependencies and devDependencies', () => {
    vi.spyOn(utils, 'readPackageJson').mockReturnValue({
      dependencies: { react: '18.0.0' },
      devDependencies: { next: '13.0.0' },
    });

    const result = detectFramework('/project');
    expect(result).toEqual({
      framework: 'next',
      contentDir: 'app',
      outDir: 'out',
    });
  });
});
