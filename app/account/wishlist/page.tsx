"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Heart, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ProductCard } from '@/components/product/ProductGrid';

const WishlistPage = () => {
  const user = useStore((s) => s.user);
  const isAuthInitialized = useStore((s) => s.isAuthInitialized);
  const storeWishlist = useStore((s) => s.wishlist);
  const toggleWishlist = useStore((s) => s.toggleWishlist);

  const wishlistItems = useMemo(() =>
    storeWishlist.map((item: any) => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      category: item.category || "Collection",
    })),
    [storeWishlist]
  );

  // REMOVE ITEM — optimistically update the store via toggleWishlist
  const removeItem = async (productId: string) => {
    if (!user?.id) return;
    await toggleWishlist(user.id, productId);
  };

  // AUTH LOADING STATE
  if (!isAuthInitialized) {
    return (
      <div className="bg-[#FAF3F5] min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#840d5c]" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#FAF3F5] min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Heart className="text-[#840d5c]/20 mb-4" size={64} />
        <h2 className="text-xl sm:text-2xl font-serif text-[#321327] mb-2">Sign in to see your wishlist</h2>
        <p className="text-xs sm:text-sm text-[#321327]/60 mb-6">Your favorite pieces are waiting for you.</p>
        <Link href="/login" className="px-8 py-3.5 sm:px-10 sm:py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
          Login / Register
        </Link>
      </div>
    );
  }

  const loading = false; // data is already in store — no local loading state needed

  return (
    <div className="bg-[#FAF3F5] min-h-screen flex flex-col">
      {/* <Header /> */}

      <main className="grow px-0 sm:px-6 md:px-8 ">
        <div className="max-w-6xl mx-auto w-full">
          
          {/* Header Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#321327]">My Wishlist</h1>
            {!loading && (
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#321327]/40">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'Item' : 'Items'} Saved
              </p>
            )}
          </div>

          {loading ? (
            <div className="text-center py-20 text-[#321327]/40 text-xs font-bold uppercase tracking-widest animate-pulse">
              Loading your collection...
            </div>
          ) : wishlistItems.length === 0 ? (
            <div className="bg-white rounded-3xl sm:rounded-[3rem] p-8 sm:p-16 md:p-20 text-center space-y-6 border border-[#840d5c]/5 shadow-sm">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FAF3F5] rounded-full flex items-center justify-center mx-auto text-[#840d5c]/30">
                <Heart size={32} className="sm:size-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#321327]">Your wishlist is empty</h2>
              <Link href="/shop" className="inline-block px-8 py-3.5 sm:px-10 sm:py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg">
                Explore Collection
              </Link>
            </div>
          ) : (
            /* Wishlist Adaptive Product Grid */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {wishlistItems.map((item) => (
                <div key={item.productId} className="flex h-full">
                  <ProductCard
                    product={{
                      id: item.productId,
                      name: item.name,
                      price: item.price,
                      image: item.image,
                      category: item.category,
                      filters: [],
                    }}
                    isWished={true}
                    onToggleWishlist={removeItem}
                    userId={user?.id || null}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Marketing Footer Card Banner Section */}
          <div className="mt-12 sm:mt-16 bg-[#321327] rounded-3xl sm:rounded-[3rem] p-6 sm:p-10 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-10 pointer-events-none">
              <Sparkles size={100} className="sm:size-30" />
            </div>
            <div className="relative z-10 max-w-lg">
              <h4 className="text-xl sm:text-2xl font-serif mb-2 sm:mb-4">Complete your look</h4>
              <p className="text-xs sm:text-sm opacity-70 leading-relaxed mb-5 sm:mb-6">
                Based on your wishlist, we think you might also love our upcoming Summer Royale collection. 
              </p>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WishlistPage;