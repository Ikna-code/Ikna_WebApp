"use client";

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Trash2, Sparkles, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { removeFromWishlist } from '@/backend/actions/order';
import { useStore } from '@/store/useStore';
import { getOptimizedSupabaseImageUrl } from '@/lib/supabaseImage';

const WishlistPage = () => {
  const user = useStore((s) => s.user);
  const isAuthInitialized = useStore((s) => s.isAuthInitialized);
  const storeWishlist = useStore((s) => s.wishlist);
  const setWishlist = useStore((s) => s.fetchWishlist); // used for refetch after remove
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

      <main className="flex-grow px-0 sm:px-6 md:px-8 ">
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
                <Heart size={32} className="sm:size-[40px]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#321327]">Your wishlist is empty</h2>
              <Link href="/shop" className="inline-block px-8 py-3.5 sm:px-10 sm:py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg">
                Explore Collection
              </Link>
            </div>
          ) : (
            /* Wishlist Adaptive Product Grid */
            <div className="grid grid-cols-2 md:grid-cols-4  gap-4 md:gap-8">
              {wishlistItems.map((item) => (
                <div 
                  key={item.productId} 
                  className="flex flex-col bg-white p-0 rounded-md shadow-xl hover:shadow-2xl transition-all duration-500 min-h-[230px] md:min-h-[330px] h-full border border-gray-100 relative group overflow-hidden"
                >
                  
                  {/* Delete Action Trigger Badge (Instead of Heart toggle) */}
                  <div className="absolute top-2 right-2 md:top-3 md:right-3 z-30">
                    <button 
                      onClick={() => removeItem(item.productId)}
                      className="bg-white/80 backdrop-blur-sm p-1.5 md:p-2 rounded-full shadow-sm text-red-400 hover:bg-[#321327] hover:text-white transition-all duration-300 active:scale-95 flex items-center justify-center"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={14} className="md:size-[16px]" />
                    </button>
                  </div>

                  {/* Image Container - Height grows with the flex-1 container */}
                  <div className="relative flex-1 w-full overflow-hidden bg-[#fcfafb]">
                    <Image 
                      src={getOptimizedSupabaseImageUrl(item.image, { width: 640, quality: 70 })} 
                      alt={item.name} 
                      fill 
                      className="object-contain p-2 md:p-4 group-hover:scale-105 transition-transform duration-1000" 
                      sizes="640px"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-24 md:h-32 bg-gradient-to-t from-[#321327]/80 via-[#321327]/40 to-transparent z-20" />
                    
                    {/* Item Details Overlay Content */}
                    <div className="absolute inset-x-0 bottom-0 z-30 p-3 md:p-5 text-white">
                      <p className="text-[7px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/80 mb-0.5 truncate">
                        {item.category}
                      </p>
                      <h2 className="text-xs md:text-lg font-serif italic mb-1 md:mb-2 truncate">
                        {item.name}
                      </h2>
                      <div className="flex items-end justify-between">
                        <div className="text-xs md:text-xl font-light text-[#d4af37]">
                          ₹{item.price?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add to Cart Button Functionality */}
                  <button 
                    onClick={() => console.log('Add to cart clicked for:', item.productId)}
                    className="relative z-10 w-full py-3 md:py-4 bg-[#321327] text-white font-bold uppercase text-[9px] md:text-[11px] tracking-[0.2em] hover:bg-[#4a1c3a] hover:text-[#d4af37] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag size={12} className="md:size-[14px]" /> Add to Cart
                  </button>

                </div>
              ))}
            </div>
          )}

          {/* Marketing Footer Card Banner Section */}
          <div className="mt-12 sm:mt-16 bg-[#321327] rounded-3xl sm:rounded-[3rem] p-6 sm:p-10 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-10 pointer-events-none">
              <Sparkles size={100} className="sm:size-[120px]" />
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