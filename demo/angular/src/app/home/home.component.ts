import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Answer Engine Optimization for the Modern Web</h1>
    <p>
      aeo.js makes your website discoverable by AI crawlers, LLMs, and answer engines — automatically.
    </p>
    <p>
      aeo.js is an open-source library that generates all the files AI systems need to understand
      your website. It supports 6 major frameworks and produces robots.txt, llms.txt, sitemap.xml,
      schema.json, and per-page markdown files from your existing content.
    </p>
    <p>
      Over 2,500 developers use aeo.js to optimize their sites for AI discovery. The library has
      been downloaded over 50,000 times since its launch in 2024 and supports Next.js, Astro, Nuxt,
      Vite, Angular, and Webpack out of the box.
    </p>
    <div class="stats">
      @for (stat of stats; track stat.label) {
        <div class="stat">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .stat { text-align: center; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
    .stat strong { display: block; font-size: 1.5rem; color: #0066cc; }
    .stat span { font-size: 0.875rem; color: #666; }
  `],
})
export class HomeComponent {
  stats = [
    { label: 'Downloads', value: '50,000+' },
    { label: 'GitHub Stars', value: '1,200+' },
    { label: 'Frameworks', value: '6' },
    { label: 'Generated Files', value: '8 types' },
  ];
}
