import type { Metadata } from 'next';
import { PAGES, SITE } from '../../../../shared/content';

const page = PAGES.about;

export const metadata: Metadata = {
  title: `${page.title} | ${SITE.title}`,
  description: page.description,
};

export default function AboutPage() {
  return (
    <>
      <h1>{page.heading}</h1>
      {page.body.split('\n\n').map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <h2>Key Features</h2>
      <ul>
        {page.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </>
  );
}
