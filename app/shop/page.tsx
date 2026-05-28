'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import ProductGridPage from "@/components/product/ProductGridPage";
import PerspectiveGallery from "@/utils/threeDBanner";
import Header from '@/components/layout/Header';
import { useStore } from '@/store/useStore';

export default function Shop() {
  const products = useStore((s) => s.products);
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    return products.filter((p: any) =>
      p?.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  return (
    <>
      <Header />
      {
        search ? (
                  <ProductGridPage products={filteredProducts} />

        ) : (
                <PerspectiveGallery
        products={filteredProducts}
      >
        <ProductGridPage products={filteredProducts} />
      </PerspectiveGallery>
        )
      }


    </>
  );
}