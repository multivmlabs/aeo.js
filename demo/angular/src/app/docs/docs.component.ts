import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-docs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Getting Started with aeo.js</h1>
    <p>Complete guide to installing and configuring aeo.js in your project.</p>
    @for (section of sections; track section.title) {
      <section>
        <h2>{{ section.title }}</h2>
        <p>{{ section.content }}</p>
      </section>
    }
  `,
  styles: [`
    section { padding: 1rem; margin-bottom: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
    h2 { margin-bottom: 0.25rem; }
  `],
})
export class DocsComponent {
  sections = [
    {
      title: 'Installation',
      content: 'Install aeo.js as a dependency in your project with npm install aeo.js. The library has zero runtime dependencies, is under 50KB, and works with Node.js 18 or later.',
    },
    {
      title: 'Quick Start',
      content: 'Add the aeo.js plugin to your framework configuration file. For Vite, add it to vite.config.ts. For Next.js, wrap your config with withAeo(). For Astro, add the integration. For Nuxt, add the module. The plugin automatically scans your pages at build time and generates all AEO files.',
    },
    {
      title: 'Configuration',
      content: 'Create an aeo.config.ts file to customize behavior. Key options include title (site name for Schema.org), url (production URL for sitemaps), description (meta tags and llms.txt), schema.organization (name, logo, sameAs profiles), og.image (default OG image), and generators (toggle individual file generators).',
    },
    {
      title: 'CLI Commands',
      content: 'aeo.js provides three CLI commands: "npx aeo.js generate" generates all AEO files, "npx aeo.js check" shows your GEO readiness score (0-100), and "npx aeo.js report" creates a full AEO/GEO report with citability scores and platform optimization hints.',
    },
  ];
}
