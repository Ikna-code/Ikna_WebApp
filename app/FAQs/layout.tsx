import type { Metadata } from 'next';
import { buildCanonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | IKNA',
  description:
    'Find answers to common questions about IKNA bras — sizing, fabric, shipping, returns, and care instructions. We\'re here to help.',
  keywords: ['IKNA FAQs', 'bra sizing guide', 'lingerie care tips', 'IKNA shipping', 'bra fit help'],
  alternates: { canonical: buildCanonical('/FAQs') },
  openGraph: {
    title: 'Frequently Asked Questions | IKNA',
    description: 'Everything you need to know about IKNA lingerie — sizing, care, shipping and more.',
    url: buildCanonical('/FAQs'),
    siteName: 'IKNA',
    type: 'website',
  },
};

export default function FAQsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
