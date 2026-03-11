import { defineConfig } from 'astro/config';
import aeoAstroIntegration from 'aeo.js/astro';

export default defineConfig({
  site: 'https://demo.aeojs.org',
  integrations: [
    aeoAstroIntegration({
      title: 'AEO Demo Site',
      description: 'A demo site showcasing aeo.js integration with Astro',
      url: 'https://demo.aeojs.org',
    }),
  ],
});
