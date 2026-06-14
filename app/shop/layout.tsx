/**
 * app/shop/layout.tsx — metadata for /shop
 */
import type { Metadata } from 'next';
import { buildCanonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shop All Lingerie Online India | Bras, Panties & More | IKNA',
  description:
    'Browse the full IKNA lingerie collection — wirefree bras, padded bras, panties, briefs and sets. Comfort-first innerwear for every woman. Free shipping across India.',
  keywords: [
    'buy lingerie online India',
    'women innerwear online',
    'bras online India',
    'panties online India',
    'IKNA shop',
    'comfort bras India',
  ],
  alternates: { canonical: buildCanonical('/shop') },
  openGraph: {
    title: 'Shop All Lingerie Online India | IKNA',
    description:
      'Discover comfort-first bras, panties, and lingerie sets at IKNA. Premium quality, honest pricing.',
    url: buildCanonical('/shop'),
    siteName: 'IKNA',
    type: 'website',
    images: [{ url: '/images/AI_images/logo1_ikna.png', alt: 'IKNA Lingerie' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop All Lingerie Online India | IKNA',
    description: 'Browse IKNA bras, panties & sets — comfort-first lingerie for every woman.',
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
