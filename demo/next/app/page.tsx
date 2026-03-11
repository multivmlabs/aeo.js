import type { Metadata } from 'next';
import { PAGES, SITE } from '../../../shared/content';

const page = PAGES.home;

export const metadata: Metadata = {
  title: `${page.title} | ${SITE.title}`,
  description: page.description,
};

export default function HomePage() {
  return (
    <>
      <h1>{page.heading}</h1>
      {page.body.split('\n\n').map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        {page.stats.map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stat.value}</div>
            <div>{stat.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
