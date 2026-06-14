/**
 * app/product/[id]/layout.tsx
 *
 * Server-side layout for the product page.
 * Responsibilities:
 *  1. generateMetadata — dynamic title, description, OG, canonical, keywords
 *  2. Product JSON-LD structured data (rich results in Google SERP)
 *  3. Breadcrumb JSON-LD structured data
 *
 * The actual product page (page.tsx) remains a Client Component for
 * interactive features. This layout wraps it and adds the SEO layer.
 */

import { cache } from 'react';
import type { Metadata } from 'next';

import { db } from '@/backend/lib/db';
import {
  extractIdFromSlug,
  generateProductSlug,
  generateProductMetadata,
  getProductJsonLd,
  getBreadcrumbJsonLd,
  buildCanonical,
  SITE_URL,
} from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';

// ─── cached DB fetch (deduplicated per request via React cache) ─────────────

const fetchProductForSeo = cache(async (rawParam: string) => {
  const id = extractIdFromSlug(rawParam);
  try {
    const product = await (db as any).product.findFirst({
      where: { id, isDeleted: false, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        colorName: true,
        fabricType: true,
        stock: true,
        images: {
          select: { image_path: true, is_primary: true },
          orderBy: { is_primary: 'desc' },
        },
        productType: { select: { name: true, slug: true } },
        subCategory: { select: { name: true, slug: true } },
      },
    });
    return product ?? null;
  } catch {
    return null;
  }
});

// ─── generateMetadata ───────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductForSeo(id);
  if (!product) return { title: 'Product Not Found | IKNA' };
  return generateProductMetadata(product);
}

// ─── Layout component ────────────────────────────────────────────────────────

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProductForSeo(id);

  if (!product) return <>{children}</>;

  const slug = generateProductSlug(product);
  const canonical = buildCanonical(`/product/${slug}`);

  const categoryName = product.subCategory?.name || product.productType?.name || 'Shop';
  const categoryHref = buildCanonical(
    `/shop/${encodeURIComponent(product.productType?.name ?? 'shop')}`,
  );

  const productJsonLd = getProductJsonLd(product, canonical);
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: categoryName, url: categoryHref },
    { name: product.name },
  ]);

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  );
}
