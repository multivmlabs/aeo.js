import type { Metadata } from 'next';
import { PAGES, SITE } from '../../../../shared/content';

const page = PAGES.pricing;

export const metadata: Metadata = {
  title: `${page.title} | ${SITE.title}`,
  description: page.description,
};

export default function PricingPage() {
  return (
    <>
      <h1>{page.heading}</h1>
      {page.body.split('\n\n').map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        {page.tiers.map((tier) => (
          <div key={tier.name} style={{ flex: 1, border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px' }}>
            <h2>{tier.name}</h2>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{tier.price}</p>
            <ul>
              {tier.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
