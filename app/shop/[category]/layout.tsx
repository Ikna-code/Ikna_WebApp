/**
 * app/shop/[category]/layout.tsx
 * Server layout: generates per-category metadata dynamically.
 */
import type { Metadata } from 'next';
import { generateCategoryMetadata } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';
import { getBreadcrumbJsonLd, buildCanonical, SITE_URL } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  return generateCategoryMetadata(decoded);
}

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Shop', url: buildCanonical('/shop') },
    { name: decoded, url: buildCanonical(`/shop/${encodeURIComponent(decoded)}`) },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  );
}
