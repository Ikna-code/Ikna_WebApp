import type { Metadata } from 'next';
import { buildCanonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Customer Reviews | Honest IKNA Bra Reviews | IKNA',
  description:
    'Read genuine customer reviews for IKNA bras. Real feedback from real women on comfort, sizing, fabric, and fit.',
  keywords: ['IKNA reviews', 'bra reviews India', 'IKNA customer feedback', 'best bras India reviews'],
  alternates: { canonical: buildCanonical('/reviews') },
  openGraph: {
    title: 'Customer Reviews | IKNA',
    description: 'Genuine reviews from IKNA customers on comfort, fit, and quality of our bras.',
    url: buildCanonical('/reviews'),
    siteName: 'IKNA',
    type: 'website',
  },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
