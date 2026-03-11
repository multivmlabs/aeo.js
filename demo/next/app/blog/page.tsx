import type { Metadata } from 'next';
import { PAGES, SITE } from '../../../../shared/content';

const page = PAGES.blog;

export const metadata: Metadata = {
  title: `${page.title} | ${SITE.title}`,
  description: page.description,
};

export default function BlogPage() {
  return (
    <>
      <h1>{page.heading}</h1>
      <p>{page.description}</p>
      {page.posts.map((post) => (
        <article key={post.title} style={{ marginBottom: '2rem' }}>
          <h2>{post.title}</h2>
          <time dateTime={post.date}>{post.date}</time>
          <p><em>{post.excerpt}</em></p>
          <p>{post.content}</p>
        </article>
      ))}
    </>
  );
}
