import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    next: 'src/plugins/next.ts',
    webpack: 'src/plugins/webpack.ts',
    astro: 'src/plugins/astro.ts',
    widget: 'src/widget/core.ts',
    react: 'src/widget/react.tsx',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'webpack',
    'next',
    '@astrojs/astro',
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