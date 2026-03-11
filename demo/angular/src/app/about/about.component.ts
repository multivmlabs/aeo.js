import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>About aeo.js</h1>
    <p>
      Learn how aeo.js generates AI-ready content from your existing pages with zero configuration.
    </p>
    <p>
      aeo.js is a zero-dependency build-time library that transforms any website into an
      AI-discoverable resource. Founded in 2024, the project addresses a critical gap: most
      websites are invisible to AI crawlers because they lack the structured files that LLMs
      and answer engines require.
    </p>
    <p>
      The library works by scanning your built HTML pages, extracting content, and generating
      a suite of standardized files. These include robots.txt with AI-specific directives,
      llms.txt summaries, sitemap.xml, Schema.org JSON-LD structured data, and per-page
      markdown files that AI systems can parse directly.
    </p>
    <p>
      Unlike traditional SEO tools that focus on search engine rankings, aeo.js targets the
      emerging ecosystem of AI-powered search — ChatGPT, Perplexity, Google AI Overviews,
      and Bing Copilot. These platforms need structured, machine-readable content to generate
      accurate citations and answers.
    </p>
    <h2>Key Features</h2>
    <ul>
      @for (feature of features; track feature) {
        <li>{{ feature }}</li>
      }
    </ul>
  `,
  styles: [`
    ul { padding-left: 1.25rem; }
    li { padding: 0.35rem 0; }
  `],
})
export class AboutComponent {
  features = [
    'Zero-config integration with 6 major frameworks',
    'Automatic Schema.org JSON-LD generation (WebSite, Organization, Article, FAQPage)',
    'Open Graph and Twitter Card meta tags',
    'GEO Readiness Score — a 0-100 audit of your AI discoverability',
    'Per-page AI Citability scoring with actionable optimization hints',
    'Platform-specific insights for ChatGPT, Perplexity, Google AI, and Bing Copilot',
  ];
}
