import type { Metadata } from 'next';
import { buildCanonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Privacy Policy | IKNA',
  description:
    'Read the IKNA Privacy Policy to understand how we collect, use, and protect your personal information when you shop with us.',
  alternates: { canonical: buildCanonical('/privacy-policy') },
  openGraph: {
    title: 'Privacy Policy | IKNA',
    description: 'IKNA\'s privacy policy — how we handle your personal data and shopping information.',
    url: buildCanonical('/privacy-policy'),
    siteName: 'IKNA',
    type: 'website',
  },
  robots: { index: true, follow: false },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
