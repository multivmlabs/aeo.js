export const SITE = {
  title: 'AEO Demo Site',
  description: 'A demo site showcasing aeo.js integration across frameworks',
  url: 'https://demo.aeojs.org',
};

export const PAGES = {
  home: {
    title: 'Home',
    heading: 'Welcome to AEO Demo',
    description: 'Explore how aeo.js makes your site discoverable by AI crawlers and LLMs.',
    body: 'This site demonstrates Answer Engine Optimization with aeo.js. Every page is automatically available as structured markdown for AI crawlers and LLMs. AEO generates robots.txt, llms.txt, llms-full.txt, sitemap.xml, and per-page markdown files — all automatically from your existing pages.',
  },
  about: {
    title: 'About',
    heading: 'About This Demo',
    description: 'Learn how aeo.js generates AI-ready content from your existing pages.',
    body: 'aeo.js is a zero-config library that makes any website discoverable by AI agents, LLMs, and answer engines. It generates structured files like robots.txt, llms.txt, llms-full.txt, sitemap.xml, ai-index.json, and per-page markdown files. It works with Astro, Next.js, Vite, Nuxt, Angular, and Webpack out of the box.',
  },
  products: {
    title: 'Products',
    heading: 'Our Products',
    description: 'Discover the tools that power answer engine optimization.',
    body: 'We offer three products designed for AI discoverability:',
    items: [
      { name: 'Alpha — Fast AI Indexer', description: 'Automatically indexes your content for AI crawlers in milliseconds.' },
      { name: 'Beta — Markdown Converter', description: 'Converts any HTML page to clean, structured markdown for LLMs.' },
      { name: 'Gamma — Widget Toolkit', description: 'An embeddable widget that lets users chat with your site content via AI.' },
    ],
  },
  contact: {
    title: 'Contact',
    heading: 'Contact Us',
    description: 'Get in touch with the aeo.js team.',
    body: 'Reach us at hello@aeojs.org or visit our GitHub repository. We welcome contributions, bug reports, and feature requests.',
  },
} as const;

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/products', label: 'Products' },
  { href: '/contact', label: 'Contact' },
];
