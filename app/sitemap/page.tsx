import Link from 'next/link';
import type { Metadata } from 'next';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { db } from '@/backend/lib/db';

export const metadata: Metadata = {
  title: 'SiteMap',
  description: 'Browse all internal links available on IKNA.',
};

const staticRoutes = [
  '/',
  '/about-us',
  '/shop',
  '/reviews',
  '/FAQs',
  '/privacy-policy',
  '/terms-and-conditions',
  '/cart',

  '/account/address',
  '/account/orders',
  '/account/payments',
  '/account/settings',
  '/account/wishlist',

] as const;

export default async function SiteMapPage() {
  const dbProductAny = (db as any).product;
  let productLinks: string[] = [];

  try {
    const products: Array<{ id: string }> = await dbProductAny.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    productLinks = products.map((product) => `/product/${product.id}`);
  } catch {
    productLinks = [];
  }

  return (
    <div className="min-h-screen bg-[#faf3f5] text-[#321327]">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-serif">SiteMap</h1>
        <p className="mt-2 text-sm sm:text-base text-[#321327]/70">
          Find all internal pages and product links in one place.
        </p>

        <section className="mt-8 rounded-2xl border border-[#840d5c]/10 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#840d5c]">Site Pages</h2>
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {staticRoutes.map((route) => (
              <li key={route}>
                <Link
                  href={route}
                  className="inline-block rounded-md px-2 py-1 hover:bg-[#faf3f5] hover:text-[#840d5c] transition-colors"
                >
                  {route}
                </Link>
              </li>
            ))}
          </ul>
        </section>


      </main>

      <Footer />
    </div>
  );
}
