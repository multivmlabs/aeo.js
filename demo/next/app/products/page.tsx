import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products | AEO Demo Site',
  description: 'Explore our demo product catalog powered by aeo.js.',
};

const products = [
  { name: 'Widget Alpha', description: 'A versatile widget for everyday use.' },
  { name: 'Widget Beta', description: 'An advanced widget with premium features.' },
  { name: 'Widget Gamma', description: 'A lightweight widget optimized for speed.' },
  { name: 'Widget Delta', description: 'A heavy-duty widget built for enterprise scale.' },
];

export default function ProductsPage() {
  return (
    <>
      <h1>Products</h1>
      <p>Browse our catalog of demo products below.</p>
      <ul>
        {products.map((product) => (
          <li key={product.name}>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
