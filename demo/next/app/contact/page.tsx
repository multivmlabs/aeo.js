import type { Metadata } from 'next';
import { PAGES, SITE } from '../../../../shared/content';

const page = PAGES.contact;

export const metadata: Metadata = {
  title: `${page.title} | ${SITE.title}`,
  description: page.description,
};

export default function ContactPage() {
  return (
    <>
      <h1>{page.heading}</h1>
      <p>{page.body}</p>
    </>
  );
}
