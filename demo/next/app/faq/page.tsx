import type { Metadata } from 'next';
import { PAGES, SITE } from '../../../../shared/content';

const page = PAGES.faq;

export const metadata: Metadata = {
  title: `${page.title} | ${SITE.title}`,
  description: page.description,
};

export default function FaqPage() {
  return (
    <>
      <h1>{page.heading}</h1>
      <p>{page.description}</p>
      <dl>
        {page.questions.map((item) => (
          <div key={item.question}>
            <dt><strong>{item.question}</strong></dt>
            <dd>{item.answer}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
