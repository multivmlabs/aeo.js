import type { Framework, FrameworkInfo } from '../types';
import { readPackageJson } from './utils';

export function detectFramework(projectRoot: string = process.cwd()): FrameworkInfo {
  const packageJson = readPackageJson(projectRoot);
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  
  if (dependencies['next']) {
    return {
      framework: 'next',
      contentDir: 'app',
      outDir: 'out',
    };
  }
  
  if (dependencies['nuxt'] || dependencies['@nuxt/kit']) {
    return {
      framework: 'nuxt',
      contentDir: 'content',
      outDir: '.output/public',
    };
  }
  
  if (dependencies['astro'] || dependencies['@astrojs/astro']) {
    return {
      framework: 'astro',
      contentDir: 'src/content',
      outDir: 'dist',
    };
  }
  
  if (dependencies['@remix-run/dev']) {
    return {
      framework: 'remix',
      contentDir: 'app',
      outDir: 'build/client',
    };
  }
  
  if (dependencies['@sveltejs/kit']) {
    return {
      framework: 'sveltekit',
      contentDir: 'src',
      outDir: 'build',
    };
  }
  
  if (dependencies['@angular/core']) {
    return {
      framework: 'angular',
      contentDir: 'src',
      outDir: 'dist',
    };
  }
  
  if (dependencies['@docusaurus/core']) {
    return {
      framework: 'docusaurus',
      contentDir: 'docs',
      outDir: 'build',
    };
  }
  
  if (dependencies['vite']) {
    return {
      framework: 'vite',
      contentDir: 'src',
      outDir: 'dist',
    };
  }
  
  return {
    framework: 'unknown',
    contentDir: 'src',
    outDir: 'dist',
  };
}