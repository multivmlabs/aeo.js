import type { Metadata } from 'next';
import { PAGES, SITE } from '../../../../shared/content';

const page = PAGES.products;

export const metadata: Metadata = {
  title: `${page.title} | ${SITE.title}`,
  description: page.description,
};

export default function ProductsPage() {
  return (
    <>
      <h1>{page.heading}</h1>
      <p>{page.body}</p>
      <ul>
        {page.items.map((item) => (
          <li key={item.name}>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
