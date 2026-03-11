import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home | AEO Demo Site',
  description: 'Welcome to the AEO Demo Site — showcasing aeo.js integration with Next.js.',
};

export default function HomePage() {
  return (
    <>
      <h1>Welcome to the AEO Demo Site</h1>
      <p>
        This is a demonstration of <strong>aeo.js</strong> integrated with a Next.js
        App Router project. The site includes multiple pages to showcase how aeo.js
        automatically generates structured data for answer engine optimization.
      </p>
      <p>
        Navigate through the pages using the links above to explore the demo.
      </p>
    </>
  );
}
