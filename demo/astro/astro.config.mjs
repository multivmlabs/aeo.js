import { defineConfig } from 'astro/config';
import aeoAstroIntegration from 'aeo.js/astro';

export default defineConfig({
  site: 'https://demo.aeojs.org',
  integrations: [
    aeoAstroIntegration({
      title: 'AEO Demo Site',
      description: 'A demo site showcasing aeo.js — the open-source Answer Engine Optimization library for modern web frameworks',
      url: 'https://demo.aeojs.org',
      schema: {
        organization: {
          name: 'aeo.js',
          url: 'https://demo.aeojs.org',
          logo: 'https://demo.aeojs.org/logo.png',
          sameAs: ['https://github.com/multivmlabs/aeo.js', 'https://x.com/aeojs'],
        },
        defaultType: 'Article',
      },
      og: {
        image: 'https://demo.aeojs.org/og-image.png',
        twitterHandle: '@aeojs',
      },
    }),
  ],
});
