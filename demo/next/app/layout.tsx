import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE, NAV_LINKS } from '../../../shared/content';
import './globals.css';

export const metadata: Metadata = {
  title: SITE.title,
  description: SITE.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
