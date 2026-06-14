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
  '/account/settings',
  '/account/wishlist',

] as const;

const formatRouteLabel = (route: string) => {
  if (route === '/') return 'home';
  return route.replace(/^\//, '');
};

export default async function SiteMapPage() {
  const dbProductTypeAny = (db as any).productType;
  let categoryBlocks: Array<{
    categoryName: string;
    categoryHref: string;
    subcategories: Array<{ name: string; href: string }>;
  }> = [];

  try {
    const productTypes: Array<{
      name: string;
      subcategories?: Array<{ name: string }>;
    }> = await dbProductTypeAny.findMany({
      where: { isActive: true },
      select: {
        name: true,
        subcategories: {
          where: { isActive: true },
          select: { name: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    categoryBlocks = productTypes.map((productType) => {
      const categoryName = String(productType.name || '').trim();
      const categoryHref = `/shop/${encodeURIComponent(categoryName)}`;
      const subcategories = (productType.subcategories || [])
        .map((subcategory) => {
          const subcategoryName = String(subcategory.name || '').trim();
          return {
            name: subcategoryName,
            href: `${categoryHref}?search=${encodeURIComponent(subcategoryName)}`,
          };
        })
        .filter((subcategory) => Boolean(subcategory.name));

      return { categoryName, categoryHref, subcategories };
    }).filter((block) => Boolean(block.categoryName));
  } catch {
    categoryBlocks = [];
  }

  return (
    <div className="min-h-screen bg-[#faf3f5] text-[#321327]">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-serif">SiteMap</h1>
        <p className="mt-2 text-sm sm:text-base text-[#321327]/70">
          Find all internal pages, categories, and subcategories in one place.
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
                  {formatRouteLabel(route)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {categoryBlocks.length > 0 && (
          <section className="mt-6 rounded-2xl border border-[#840d5c]/10 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#840d5c]">Categories</h2>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {categoryBlocks.map((block) => (
                <div key={block.categoryName} className="rounded-xl border border-[#840d5c]/10 p-4 bg-[#fffafb]">
                  <span className="inline-block text-sm font-bold text-[#321327]">
                    {block.categoryName}
                  </span>

                  {block.subcategories.length > 0 && (
                    <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {block.subcategories.map((subcategory) => (
                        <li key={`${block.categoryName}-${subcategory.name}`}>
                          <Link
                            href={subcategory.href}
                            className="inline-block rounded-md px-2 py-1 text-[#321327]/80 hover:bg-[#faf3f5] hover:text-[#840d5c] transition-colors"
                          >
                            {subcategory.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}


      </main>

      <Footer />
    </div>
  );
}
