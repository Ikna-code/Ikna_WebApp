'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import ProductGridPage from "@/components/product/ProductGridPage";
import PerspectiveGallery from "@/utils/threeDBanner";
import Header from '@/components/layout/Header';
import { useStore } from '@/store/useStore';

export default function Shop() {
  const products = useStore((s) => s.products);
  const isProductsInitialized = useStore((s) => s.isProductsInitialized);
  const loadProducts = useStore((s) => s.loadProducts);
  const hasForcedReloadRef = useRef(false);
  const [apiFallbackProducts, setApiFallbackProducts] = useState<any[]>([]);
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

  useEffect(() => {
    if (products.length > 0) {
      setApiFallbackProducts([]);
      return;
    }

    let isMounted = true;

    const fetchFallbackProducts = async () => {
      try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        if (!response.ok) return;

        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : [];

        const normalized = rows.map((product: any) => {
          const images = Array.isArray(product?.images) ? product.images : [];
          const primary = images.find((image: any) => Boolean(image?.is_primary));

          return {
            ...product,
            image: product?.image || primary?.image_path || images[0]?.image_path || '',
            product_images: images,
          };
        });

        if (isMounted) {
          setApiFallbackProducts(normalized);
        }
      } catch {
        if (isMounted) {
          setApiFallbackProducts([]);
        }
      }
    };

    void fetchFallbackProducts();

    return () => {
      isMounted = false;
    };
  }, [products]);

  const sourceProducts = products.length > 0 ? products : apiFallbackProducts;

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