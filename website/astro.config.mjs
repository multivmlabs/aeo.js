// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { aeoAstroIntegration } from 'aeo.js/astro';

export default defineConfig({
	site: 'https://aeojs.org',
	integrations: [
		aeoAstroIntegration({
			title: 'aeo.js — Answer Engine Optimization for the Modern Web',
			description: 'Make your website discoverable by ChatGPT, Claude, Perplexity & AI search engines. Auto-generates llms.txt, robots.txt, sitemap, JSON-LD structured data & more.',
			url: 'https://aeojs.org',
			schema: {
				organization: {
					name: 'aeo.js',
					url: 'https://aeojs.org',
					logo: 'https://aeojs.org/og.png',
					sameAs: [
						'https://github.com/multivmlabs/aeo.js',
						'https://www.npmjs.com/package/aeo.js',
					],
				},
			},
			widget: {
				enabled: true,
				position: 'bottom-right',
				size: 'small',
				showBadge: true,
				theme: {
					background: 'rgba(10, 10, 10, 0.95)',
					text: '#d4d4d4',
					accent: '#ffffff',
					badge: '#4ADE80',
				},
			},
		}),
		starlight({
			title: 'aeo.js',
			description: 'Make your website discoverable by ChatGPT, Claude, Perplexity & AI search engines. Auto-generates llms.txt, robots.txt, sitemap, JSON-LD structured data & more. Works with Next.js, Astro, Vite, Nuxt & Angular.',
			social: [],
			components: {
				Header: './src/components/Header.astro',
				Hero: './src/components/Hero.astro',
				Footer: './src/components/Footer.astro',
			},
			customCss: ['./src/styles/custom.css'],
			head: [
				{ tag: 'meta', attrs: { property: 'og:image', content: 'https://aeojs.org/og.png' } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
				{ tag: 'meta', attrs: { property: 'og:image:type', content: 'image/png' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: 'https://aeojs.org/og.png' } },
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
					],
				},
				{
					label: 'Frameworks',
					items: [
						{ label: 'Astro', slug: 'frameworks/astro' },
						{ label: 'Next.js', slug: 'frameworks/nextjs' },
						{ label: 'Vite', slug: 'frameworks/vite' },
						{ label: 'Nuxt', slug: 'frameworks/nuxt' },
						{ label: 'Angular', slug: 'frameworks/angular' },
						{ label: 'Webpack', slug: 'frameworks/webpack' },
					],
				},
				{
					label: 'Features',
					items: [
						{ label: 'Generated Files', slug: 'features/generated-files' },
						{ label: 'Widget', slug: 'features/widget' },
						{ label: 'CLI', slug: 'features/cli' },
						{ label: 'Schema & Open Graph', slug: 'features/schema-og' },
						{ label: 'Audit & Citability', slug: 'features/audit' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Configuration', slug: 'reference/configuration' },
						{ label: 'API', slug: 'reference/api' },
					],
				},
			],
		}),
	],
});
