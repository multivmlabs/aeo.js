import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'plugins/vite': 'src/plugins/vite.ts',
    'plugins/next': 'src/plugins/next.ts',
    'plugins/astro': 'src/plugins/astro.ts',
    'plugins/nuxt': 'src/plugins/nuxt.ts',
    'plugins/webpack': 'src/plugins/webpack.ts',
    'widget/react': 'src/widget/react.tsx',
    'widget/vue': 'src/widget/vue.ts',
    'widget/svelte': 'src/widget/svelte.ts',
    'widget/core': 'src/widget/core.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'vue',
    'svelte',
    'vite',
    'webpack',
    'next',
    '@astrojs/astro',
    '@nuxt/kit',
    '@sveltejs/kit',
  ],
  treeshake: true,
  minify: process.env.NODE_ENV === 'production',
  target: 'node16',
  shims: true,
  skipNodeModulesBundle: true,
  loader: {
    '.json': 'json',
  },
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'react'
  },
})