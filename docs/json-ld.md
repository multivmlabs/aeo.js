# Custom JSON-LD Recipes

aeo.js generates `WebSite`, `Organization`, and `WebPage` schemas automatically when `schema.enabled: true`. For richer page-type-specific schemas — FAQ, HowTo, Product, Article, Recipe, Event — you'll add them yourself in your page templates.

This doc is a framework-agnostic catalog of copy-paste recipes. Each one is paired with the **safe escape helper** that prevents `</script>` (and U+2028/U+2029) in dynamic values from breaking out of the `<script>` tag.

## The safe serializer

Always run JSON-LD payloads through this helper before injecting them into a `<script>` tag. It mirrors `serializeJsonForHtml` from [src/core/schema.ts](https://github.com/multivmlabs/aeo.js/blob/main/src/core/schema.ts).

```ts
// lib/serialize-json-ld.ts
export function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
```

Why this matters: `JSON.stringify(...)` does not escape `</script>`. If a page title or body field ever contains `</script>...<script>alert(1)</script>`, the rendered HTML executes arbitrary JS. The five replacements above neutralize every script-breakout vector.

> aeo.js's own auto-generated JSON-LD already uses this serializer internally. The recipes below are for **custom** JSON-LD you add on top.

## FAQ Page

For pages with a list of questions and answers. Each `Question` should be the heading, each `Answer` should be the full answer text (Google requires the whole thing, not a truncated preview).

```ts
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Answer Engine Optimization?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AEO is the practice of making your content discoverable and citable by AI-powered answer engines like ChatGPT, Claude, and Perplexity.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is AEO different from SEO?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SEO optimizes for ranking on search engines. AEO optimizes for being cited in AI-generated answers — different signal mix, different file outputs.',
      },
    },
  ],
};
```

aeo.js **auto-detects** FAQ patterns in your page content: headings that end with `?` followed by an answer paragraph. If your FAQ matches that shape, you don't need to write the schema manually — set `schema.enabled: true` and the generator emits it.

## HowTo

For step-by-step instructions. Strong signal for ChatGPT and Perplexity when users ask "how do I…" questions.

```ts
const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to deploy a Next.js site to Vercel',
  description: 'Step-by-step guide to deploying a Next.js application to Vercel.',
  totalTime: 'PT5M',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Install the Vercel CLI',
      text: 'Run `npm install -g vercel` to install the Vercel CLI globally.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Authenticate',
      text: 'Run `vercel login` and follow the prompts to authenticate.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Deploy',
      text: 'Run `vercel --prod` from your project root.',
    },
  ],
};
```

aeo.js **auto-detects** HowTo patterns: headings like `Step 1:` / `Step 2:` or a sequence of numbered `## How to …` headings. Two or more step headings trigger automatic schema generation.

## Article / BlogPosting

For long-form content. Tells AI engines the author, publish date, and update history — improves citability and shows up in Perplexity's "Sources" list.

```ts
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',                   // or 'NewsArticle', 'TechArticle', 'Article'
  headline: 'Optimizing your site for AI search engines in 2026',
  description: 'A practical guide to AEO for technical content sites.',
  image: 'https://mysite.com/og/article-cover.png',
  datePublished: '2026-05-14T10:00:00Z',
  dateModified: '2026-05-14T10:00:00Z',
  author: {
    '@type': 'Person',
    name: 'Jane Author',
    url: 'https://mysite.com/authors/jane',
  },
  publisher: {
    '@type': 'Organization',
    name: 'My Site',
    logo: {
      '@type': 'ImageObject',
      url: 'https://mysite.com/logo.png',
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://mysite.com/blog/optimizing-for-ai-search',
  },
};
```

> Always use ISO-8601 strings for `datePublished` / `dateModified`. A raw `Date` object passed through a template literal renders as `"Thu May 14 2026 ..."` and breaks validators. If your CMS returns a `Date`, wrap it: `new Date(d).toISOString()`.

## Product

For e-commerce product pages. Pulls into Google's product cards and AI shopping answers.

```ts
const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Acme Espresso Machine',
  description: 'A semi-automatic espresso machine with built-in grinder.',
  image: [
    'https://mysite.com/products/espresso/cover.jpg',
    'https://mysite.com/products/espresso/side.jpg',
  ],
  sku: 'ACM-ESP-001',
  brand: { '@type': 'Brand', name: 'Acme' },
  offers: {
    '@type': 'Offer',
    url: 'https://mysite.com/products/espresso',
    priceCurrency: 'USD',
    price: '899.00',
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.7',
    reviewCount: '142',
  },
};
```

## Recipe

For cooking / instructional content. Strong signal for AI assistants answering "how do I make…" or "recipe for…" queries.

```ts
const recipeSchema = {
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: 'Classic Margherita Pizza',
  image: 'https://mysite.com/recipes/margherita.jpg',
  description: 'A simple Neapolitan-style margherita with fresh basil.',
  author: { '@type': 'Person', name: 'Chef Alice' },
  datePublished: '2026-05-01T12:00:00Z',
  prepTime: 'PT30M',
  cookTime: 'PT10M',
  totalTime: 'PT40M',
  recipeYield: '2 pizzas',
  recipeCategory: 'Main course',
  recipeCuisine: 'Italian',
  nutrition: {
    '@type': 'NutritionInformation',
    calories: '850 kcal',
  },
  recipeIngredient: [
    '500g type-00 flour',
    '325ml water',
    '10g sea salt',
    '2g fresh yeast',
    '200g San Marzano tomatoes',
    '125g fresh mozzarella',
    'Fresh basil leaves',
  ],
  recipeInstructions: [
    {
      '@type': 'HowToStep',
      name: 'Mix the dough',
      text: 'Combine flour, water, salt, and yeast. Knead for 10 minutes.',
    },
    {
      '@type': 'HowToStep',
      name: 'Proof',
      text: 'Let rest at room temperature for 24 hours.',
    },
    {
      '@type': 'HowToStep',
      name: 'Bake',
      text: 'Stretch into 30cm circles. Top and bake at 500°F for 6–8 minutes.',
    },
  ],
};
```

## Event

For events with a date, location, and organizer.

```ts
const eventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'AEO Summit 2026',
  startDate: '2026-09-15T09:00:00-07:00',
  endDate: '2026-09-15T17:00:00-07:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
  location: [
    {
      '@type': 'Place',
      name: 'Moscone Center',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '747 Howard St',
        addressLocality: 'San Francisco',
        addressRegion: 'CA',
        postalCode: '94103',
        addressCountry: 'US',
      },
    },
    {
      '@type': 'VirtualLocation',
      url: 'https://aeo-summit.example/live',
    },
  ],
  organizer: {
    '@type': 'Organization',
    name: 'AEO Summit',
    url: 'https://aeo-summit.example',
  },
  offers: {
    '@type': 'Offer',
    url: 'https://aeo-summit.example/tickets',
    price: '299',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    validFrom: '2026-06-01T00:00:00-07:00',
  },
};
```

## VideoObject

For pages with embedded video. Improves discoverability in Google's video carousels and helps AI assistants reference the video.

```ts
const videoSchema = {
  '@context': 'https://schema.org',
  '@type': 'VideoObject',
  name: 'aeo.js: a 5-minute tour',
  description: 'Walk through aeo.js setup in five minutes — install, init, generate.',
  thumbnailUrl: ['https://mysite.com/thumbs/aeo-tour-1280x720.jpg'],
  uploadDate: '2026-05-01T12:00:00Z',
  duration: 'PT5M12S',
  contentUrl: 'https://mysite.com/videos/aeo-tour.mp4',
  embedUrl: 'https://mysite.com/embed/aeo-tour',
  publisher: {
    '@type': 'Organization',
    name: 'My Site',
    logo: { '@type': 'ImageObject', url: 'https://mysite.com/logo.png' },
  },
};
```

## BreadcrumbList

Tells AI engines (and search engines) the hierarchy path of the current page. Useful on deep pages — `Home → Blog → 2026 → Optimizing for AI`.

```ts
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://mysite.com/' },
    { '@type': 'ListItem', position: 2, name: 'Blog',  item: 'https://mysite.com/blog' },
    { '@type': 'ListItem', position: 3, name: '2026',  item: 'https://mysite.com/blog/2026' },
    { '@type': 'ListItem', position: 4, name: 'Optimizing for AI' },
  ],
};
```

## Injecting safely — per framework

### Next.js (App Router)

```tsx
// app/page.tsx
import { serializeJsonForHtml } from '@/lib/serialize-json-ld';

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonForHtml(faqSchema) }}
      />
      {/* page content */}
    </>
  );
}
```

### Astro

```astro
---
import { serializeJsonForHtml } from '../lib/serialize-json-ld';
---

<script type="application/ld+json" set:html={serializeJsonForHtml(faqSchema)} />
```

### Nuxt / Vue (useHead)

```vue
<script setup lang="ts">
import { serializeJsonForHtml } from '~/utils/serialize-json-ld';

useHead({
  script: [
    {
      type: 'application/ld+json',
      children: serializeJsonForHtml(faqSchema),
    },
  ],
});
</script>
```

### Svelte / SvelteKit

Use a real `<script>` element inside `<svelte:head>` and limit `{@html}` to the **text content** so the Svelte compiler stays aware of the element boundary:

```svelte
<script lang="ts">
  import { serializeJsonForHtml } from './lib/serialize-json-ld';
  const schema = serializeJsonForHtml(faqSchema);
</script>

<svelte:head>
  <script type="application/ld+json">{@html schema}</script>
</svelte:head>
```

### React + Helmet

```tsx
import { Helmet } from 'react-helmet-async';
import { serializeJsonForHtml } from './lib/serialize-json-ld';

<Helmet>
  <script type="application/ld+json">{serializeJsonForHtml(faqSchema)}</script>
</Helmet>
```

### Vanilla HTML

```html
<script type="application/ld+json" id="faq-schema"></script>
<script type="module">
  import { faqSchema } from './data.js';
  function serializeJsonForHtml(v) {
    return JSON.stringify(v)
      .replace(/</g, '\\u003C')
      .replace(/>/g, '\\u003E')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }
  document.getElementById('faq-schema').textContent = serializeJsonForHtml(faqSchema);
</script>
```

## Validation

After deploying, paste the page URL into one of these:

- [Schema Markup Validator](https://validator.schema.org/) — quickest, official schema.org
- [Google Rich Results Test](https://search.google.com/test/rich-results) — confirms eligibility for Google's enhanced results
- [Bing Webmaster URL Inspection](https://www.bing.com/webmasters/url-inspection) — Bing/Copilot-specific feedback

## Best Practices

- **One `<script type="application/ld+json">` per schema type.** Don't merge multiple `@type`s into a single JSON array unless you're using `@graph`.
- **Always escape via `serializeJsonForHtml`.** No exceptions, even for "trivially static" data — schemas evolve.
- **ISO dates everywhere.** `new Date(d).toISOString()` is your friend.
- **Absolute URLs in `image`, `url`, `logo`.** Relative URLs work less reliably in AI crawlers than in browsers.
- **Test before you ship.** Schemas with subtle typos (missing `@type`, wrong `@context`) silently fail in production.

## Further Reading

- [Schema.org type reference](https://schema.org/docs/full.html)
- [Google's structured data gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
- [aeo.js schema generator source](https://github.com/multivmlabs/aeo.js/blob/main/src/core/schema.ts)
- [Back to Overview](./README.md)
