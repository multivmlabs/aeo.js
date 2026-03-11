export default defineNuxtConfig({
  modules: ['aeo.js/nuxt'],
  aeo: {
    title: 'AEO Demo Site',
    description: 'A demo site showcasing aeo.js integration with Nuxt',
    url: 'https://demo.aeojs.org',
  },
  devtools: { enabled: false },
  // Needed for file:../../ symlink — ensures @nuxt/kit resolves from this project
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
});
