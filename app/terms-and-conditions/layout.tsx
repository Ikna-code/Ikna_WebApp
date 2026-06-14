import type { Metadata } from 'next';
import { buildCanonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Terms & Conditions | IKNA',
  description:
    'Review the IKNA Terms & Conditions — our policies on purchases, hygiene, shipping, and use of our website.',
  alternates: { canonical: buildCanonical('/terms-and-conditions') },
  openGraph: {
    title: 'Terms & Conditions | IKNA',
    description: 'IKNA\'s terms of service covering purchases, hygiene policies, and website usage.',
    url: buildCanonical('/terms-and-conditions'),
    siteName: 'IKNA',
    type: 'website',
  },
  robots: { index: true, follow: false },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
