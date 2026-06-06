'use client';

import dynamic from 'next/dynamic';

const ProductGridNoSSR = dynamic(() => import('@/components/product/ProductGrid'), {
  ssr: false,
});

export default function ProductGridClient() {
  return <ProductGridNoSSR />;
}
