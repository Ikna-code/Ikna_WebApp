"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { ProductCard } from "./ProductGrid";
import { getWishlist } from "@/backend/actions/order";
import { createClient } from "@/backend/lib/supabaseClient";

interface ProductGridPageProps {
  products: any[];
}

const ProductGridPage: React.FC<ProductGridPageProps> = ({
  products = [],
}) => {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        setLoading(true);

        // Logged in user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const currentUserId = user?.id || null;

        setUserId(currentUserId);

        // Wishlist
        if (currentUserId) {
          const wishlistData = await getWishlist(currentUserId);

          const wishlistIds = wishlistData.map(
            (item: any) => item.productId
          );

          setWishlist(wishlistIds);
        }
      } catch (error) {
        console.error("Critical error loading wishlist:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, []);

  // Local wishlist sync
  const handleLocalToggle = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id)
        ? prev.filter((pId) => pId !== id)
        : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F3F5] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#840d5c] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9F3F5] min-h-screen flex flex-col">
      
      {/* HEADER */}
      <header className="container mx-auto px-4 md:px-8 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-serif text-[#321327] mb-4">
          Explore the Collection
        </h1>

        <p className="text-sm tracking-widest text-[#840d5c] uppercase font-bold">
          Engineered for Comfort, Designed for You
        </p>

        {/* PRODUCT COUNT */}
        <p className="mt-4 text-sm text-[#321327]/60">
          {products.length} Product
          {products.length !== 1 ? "s" : ""} Found
        </p>
      </header>

      {/* FULL WIDTH COMBO BANNER */}
      <section className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 mb-12">
        <img
          src="/images/combo.jpeg"
          alt="Collection Banner"
          className="w-screen h-150 object-contain"
        />
      </section>

      {/* PRODUCT GRID */}
      <main className="w-full px-4 md:px-8 flex-grow pb-20">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 md:gap-x-8 md:gap-y-10">
            {products.map((product) => (
              <div
                key={product.id}
                className="group cursor-pointer"
                onClick={() =>
                  router.push(`/product/${product.id}`)
                }
              >
                <ProductCard
                  product={product}
                  isWished={wishlist.includes(product.id)}
                  onToggleWishlist={handleLocalToggle}
                  userId={userId}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h3 className="text-2xl font-serif text-[#321327] mb-3">
              No Products Found
            </h3>

            <p className="text-[#321327]/60 text-sm">
              Try searching with another keyword.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductGridPage;