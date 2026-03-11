import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | AEO Demo Site',
  description: 'Get in touch with us.',
};

export default function ContactPage() {
  return (
    <>
      <h1>Contact</h1>
      <p>
        Have questions about aeo.js or this demo? We would love to hear from you.
      </p>
      <p>
        <strong>Email:</strong> hello@aeojs.org
      </p>
      <p>
        <strong>GitHub:</strong>{' '}
        <a href="https://github.com/multivmlabs/aeojs" target="_blank" rel="noopener noreferrer">
          multivmlabs/aeojs
        </a>
      </p>
    </>
  );
}
