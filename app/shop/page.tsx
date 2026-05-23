'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import ProductGridPage from "@/components/product/ProductGridPage";
import PerspectiveGallery from "@/utils/threeDBanner";
import Header from '@/components/layout/Header';
import { getAllProducts } from "@/backend/actions/products";

export default function Shop() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);

  const searchParams = useSearchParams();

  // Get search query from URL
  const search = searchParams.get("search") || "";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const fetchedProducts = await getAllProducts();

        console.log("Fetched products:", fetchedProducts);

        setProducts(fetchedProducts);

        // FILTER PRODUCTS
        if (search.trim()) {
          const filtered = fetchedProducts.filter((product: any) =>
            product?.name
              ?.toLowerCase()
              .includes(search.toLowerCase())
          );

          setFilteredProducts(filtered);
        } else {
          setFilteredProducts(fetchedProducts);
        }

      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, [search]);

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