import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>What aeo.js Generates</h1>
    <p>Discover the 8 file types that aeo.js generates to make your site AI-discoverable.</p>
    <p>aeo.js generates 8 types of files from your existing content, each targeting a different aspect of AI discoverability:</p>
    <ul>
      @for (product of products; track product.name) {
        <li>
          <h2>{{ product.name }}</h2>
          <p>{{ product.description }}</p>
        </li>
      }
    </ul>
  `,
  styles: [`
    ul { list-style: none; padding: 0; }
    li { padding: 1rem; margin-bottom: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
    h2 { margin-bottom: 0.25rem; }
  `],
})
export class ProductsComponent {
  products = [
    { name: 'robots.txt', description: 'AI-aware directives that allow GPTBot, ClaudeBot, Bingbot, and other AI crawlers to index your content. Includes sitemap references and crawl delay settings.' },
    { name: 'llms.txt', description: 'A concise summary of your site optimized for LLM context windows. Contains site metadata, page list with descriptions, and navigation structure.' },
    { name: 'llms-full.txt', description: 'Complete content export with full markdown text for every page. Designed for AI systems that need deep content understanding.' },
    { name: 'sitemap.xml', description: 'Standard XML sitemap with all discoverable pages, last-modified dates, and change frequency hints for search engines and AI crawlers.' },
    { name: 'ai-index.json', description: 'Structured JSON index with page content, descriptions, keywords, and metadata — purpose-built for AI ingestion pipelines.' },
    { name: 'schema.json', description: 'Schema.org JSON-LD structured data including WebSite, Organization, Article/WebPage, BreadcrumbList, and auto-detected FAQPage schemas.' },
    { name: 'docs.json', description: 'Documentation manifest with categorized content, markdown URLs, and content summaries for AI documentation assistants.' },
    { name: 'Per-page .md files', description: 'Individual markdown files for each page with YAML frontmatter, clean content extraction, and structural preservation.' },
  ];
}
