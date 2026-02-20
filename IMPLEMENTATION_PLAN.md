# aeo.js Implementation Plan

## Core Architecture Setup
- [x] Package.json with exports map
- [x] tsup.config.ts for multi-entry bundling
- [x] vitest.config.ts for testing

## Core Generators (src/core/)
- [x] detect.ts - Framework auto-detection
- [x] utils.ts - Utilities and config resolution
- [x] robots.ts - robots.txt with AI crawlers
- [x] llms-txt.ts - llms.txt summary
- [x] llms-full.ts - llms-full.txt concatenated
- [x] raw-markdown.ts - Markdown file copying
- [x] manifest.ts - docs.json manifest
- [x] sitemap.ts - sitemap.xml
- [x] ai-index.ts - ai-index.json RAG-optimized
- [x] generate.ts - Main orchestrator

## Widget Implementation (src/widget/)
- [x] core.ts - Vanilla JS widget class
- [x] styles.ts - CSS-in-JS styling
- [x] icons.ts - SVG icons as strings
- [x] extract.ts - DOM-to-markdown fallback
- [x] react.tsx - React wrapper component
- [x] vue.ts - Vue 3 wrapper
- [x] svelte.ts - Svelte wrapper

## Plugin Integrations (src/plugins/)
- [x] vite.ts - Vite plugin
- [x] next.ts - Next.js withAeo wrapper
- [x] webpack.ts - Standalone webpack plugin
- [x] astro.ts - Astro integration
- [x] nuxt.ts - Nuxt module

## Testing
- [ ] Core generator tests
- [ ] Widget functionality tests

## Documentation
- [ ] Website scaffolding (Docusaurus)
- [ ] Usage examples
- [ ] API documentation