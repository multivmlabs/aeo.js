import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    vite: 'src/plugins/vite.ts',
    next: 'src/plugins/next.ts',
    webpack: 'src/plugins/webpack.ts',
    astro: 'src/plugins/astro.ts',
    nuxt: 'src/plugins/nuxt.ts',
    widget: 'src/widget/core.ts',
    react: 'src/widget/react.tsx',
    vue: 'src/widget/vue.ts',
  },
  format: ['esm', 'cjs'],
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