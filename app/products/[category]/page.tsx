'use client';

import React, { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

import ProductGridPage from "@/components/product/ProductGridPage";
import PerspectiveGallery from "@/utils/threeDBanner";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useStore } from '@/store/useStore';

export default function CategoryPage() {
  const params = useParams();
  const category = decodeURIComponent(params.category as string);
  
  const products = useStore((s) => s.products);
  const isProductsInitialized = useStore((s) => s.isProductsInitialized);
  const loadProducts = useStore((s) => s.loadProducts);
  const hasForcedReloadRef = useRef(false);

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
        <PerspectiveGallery products={sourceProducts}>
          <ProductGridPage products={sourceProducts} initialCategory={category} searchQuery="" />
        </PerspectiveGallery>
      </div>
    </>
  );
}
