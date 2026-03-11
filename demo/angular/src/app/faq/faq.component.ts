import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-faq',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Frequently Asked Questions</h1>
    <p>Common questions about aeo.js, answer engine optimization, and AI discoverability.</p>
    @for (item of questions; track item.question) {
      <details>
        <summary>{{ item.question }}</summary>
        <p>{{ item.answer }}</p>
      </details>
    }
  `,
  styles: [`
    details { padding: 1rem; margin-bottom: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
    summary { font-weight: bold; cursor: pointer; }
    summary:hover { color: #0066cc; }
    details p { margin-top: 0.75rem; }
  `],
})
export class FaqComponent {
  questions = [
    {
      question: 'What is Answer Engine Optimization (AEO)?',
      answer: 'Answer Engine Optimization is the practice of making your website content easily discoverable and extractable by AI-powered search engines and answer engines. Unlike traditional SEO which focuses on ranking in search results, AEO ensures that AI systems like ChatGPT, Perplexity, and Google AI Overviews can accurately understand, cite, and surface your content.',
    },
    {
      question: 'How is AEO different from SEO?',
      answer: 'SEO focuses on ranking signals like backlinks, keywords, and page speed to appear in traditional search results. AEO focuses on content structure, machine-readable formats, and Schema.org markup to help AI systems extract and cite your content. AEO and SEO are complementary — good AEO practices also improve SEO.',
    },
    {
      question: 'Does aeo.js work with my framework?',
      answer: 'aeo.js supports 6 major frameworks out of the box: Next.js (App Router and Pages Router), Astro, Nuxt 3, Vite (with any frontend library), Angular 17+, and Webpack. Each framework has a dedicated plugin that integrates with its build pipeline.',
    },
    {
      question: 'What is a GEO Readiness Score?',
      answer: 'The GEO Readiness Score is a 0-100 rating that measures how well your site is optimized for AI discovery. It evaluates 5 categories: AI Access, Content Structure, Schema Presence, Meta Quality, and Citability.',
    },
    {
      question: 'Does aeo.js require any external APIs?',
      answer: 'No. aeo.js is a zero-dependency, build-time library. It runs entirely on your machine during the build process with no external API calls, no cloud services, and no tracking.',
    },
    {
      question: 'How do I improve my AI Citability Score?',
      answer: 'Write self-contained paragraphs, include concrete statistics and dates, use FAQ-style headings ending with question marks, structure content with lists and short paragraphs under 167 words, and add a summary section at the top of long pages.',
    },
  ];
}
