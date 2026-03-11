import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { aeoVitePlugin } from 'aeo.js/vite';

export default defineConfig({
  plugins: [
    react(),
    aeoVitePlugin({
      title: 'AEO Demo Site',
      description: 'A demo site showcasing aeo.js integration with Vite + React',
      url: 'https://demo.aeojs.org',
      pages: [
        { pathname: '/', title: 'Home', description: 'Welcome to AEO Demo' },
        { pathname: '/about', title: 'About', description: 'About the AEO Demo' },
        { pathname: '/products', title: 'Products', description: 'Our Products' },
        { pathname: '/contact', title: 'Contact', description: 'Contact Us' },
      ],
    }),
  ],
});
