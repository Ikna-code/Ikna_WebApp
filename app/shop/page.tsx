'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

import ProductGridPage from "@/components/product/ProductGridPage";
import PerspectiveGallery from "@/utils/threeDBanner";
import Header from '@/components/layout/Header';
import { useStore } from '@/store/useStore';
import { ShopPageSkeleton } from '@/components/utility/PageSkeletons';

function ShopContent() {
  const products = useStore((s) => s.products);
  const isProductsInitialized = useStore((s) => s.isProductsInitialized);
  const loadProducts = useStore((s) => s.loadProducts);
  const hasForcedReloadRef = useRef(false);
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const effectiveInitialCategory = search.trim() ? "" : category;

  useEffect(() => {
    if (!isProductsInitialized) {
      void loadProducts();
      return;
    }

    if (!hasForcedReloadRef.current && products.length === 0) {
      hasForcedReloadRef.current = true;
      void loadProducts(true);
    }
  }, [isProductsInitialized, loadProducts, products.length]);

  const sourceProducts = products;

  return (
    <>
      <Header />
      <div id="shop-content" className="shop-content-layer">
        {search ? (
          <ProductGridPage products={sourceProducts} initialCategory={effectiveInitialCategory} searchQuery={search} />
        ) : (
          <PerspectiveGallery products={sourceProducts}>
            <ProductGridPage products={sourceProducts} initialCategory={effectiveInitialCategory} searchQuery={search} />
          </PerspectiveGallery>
        )}
      </div>
    </>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <ShopContent />
    </Suspense>
  );
}