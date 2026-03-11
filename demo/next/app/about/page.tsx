import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | AEO Demo Site',
  description: 'Learn more about the AEO Demo Site and the aeo.js library.',
};

export default function AboutPage() {
  return (
    <>
      <h1>About</h1>
      <p>
        The AEO Demo Site is a sample project built to demonstrate how <strong>aeo.js</strong> works
        with Next.js. AEO (Answer Engine Optimization) helps your site surface better
        in AI-powered search engines and answer engines.
      </p>
      <p>
        This project uses the Next.js App Router with server components and integrates
        aeo.js via the <code>withAeo</code> Next.js plugin to automatically inject
        structured data and metadata across all pages.
      </p>
    </>
  );
}
