import type { Metadata } from 'next';
import { PAGES, SITE } from '../../../../shared/content';

const page = PAGES.docs;

export const metadata: Metadata = {
  title: `${page.title} | ${SITE.title}`,
  description: page.description,
};

export default function DocsPage() {
  return (
    <>
      <h1>{page.heading}</h1>
      <p>{page.description}</p>
      {page.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.content}</p>
        </section>
      ))}
    </>
  );
}
