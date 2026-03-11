import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-blog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Latest from aeo.js</h1>
    <p>News, updates, and insights about answer engine optimization and AI discoverability.</p>
    @for (post of posts; track post.title) {
      <article>
        <h2>{{ post.title }}</h2>
        <time>{{ post.date }}</time>
        <p class="excerpt">{{ post.excerpt }}</p>
        <p>{{ post.content }}</p>
      </article>
    }
  `,
  styles: [`
    article { padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #e0e0e0; border-radius: 8px; }
    h2 { margin-bottom: 0.25rem; }
    time { font-size: 0.875rem; color: #666; }
    .excerpt { font-style: italic; color: #444; }
  `],
})
export class BlogComponent {
  posts = [
    {
      title: 'Why Your Website is Invisible to AI',
      date: '2024-12-15',
      excerpt: 'Over 90% of websites lack the structured files that AI systems need to cite their content.',
      content: 'Most websites today are invisible to AI-powered search engines. AI systems need content in formats like markdown, JSON-LD, and plain text. Without these files, your content does not exist in the AI knowledge base. Studies show that websites with structured AI-ready files are cited 3.2x more frequently by answer engines.',
    },
    {
      title: 'GEO vs SEO: The New Landscape',
      date: '2025-01-20',
      excerpt: 'Generative Engine Optimization is reshaping how we think about web content.',
      content: 'Research from Georgia Tech found that 47% of AI-generated answers cite content from sources that optimize for machine readability. Self-contained factual paragraphs are cited 2.1x more than context-dependent text. Content with statistics is cited 1.8x more than content without.',
    },
  ];
}
