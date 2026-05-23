"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { IoIosStar } from 'react-icons/io';
import { MdVerified } from 'react-icons/md';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { HiMiniShoppingCart } from 'react-icons/hi2';
import { PiShirtFolded } from 'react-icons/pi';
import { useRouter } from 'next/navigation';

import { IMAGE_BASE_URL } from '@/public/constants/constants';
import { getAllProducts } from "@/backend/actions/products";
import { toggleWishlistAction, getWishlist } from '@/backend/actions/order';
import { createClient } from '@/backend/lib/supabaseClient';

// --- PRODUCT CARD COMPONENT ---
export const ProductCard = ({
  product,
  isWished,
  onToggleWishlist,
  userId
}: {
  product: any,
  isWished: boolean,
  onToggleWishlist: (id: string) => void,
  userId: string | null
}) => {
  const [tooltip, setTooltip] = useState<{ show: boolean, msg: string }>({
    show: false,
    msg: ''
  });

  const [isPending, setIsPending] = useState(false);

  const showTooltip = (msg: string) => {
    setTooltip({ show: true, msg });

    setTimeout(() => {
      setTooltip({ show: false, msg: '' });
    }, 2500);
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!userId) {
      showTooltip("Please login to use wishlist");
      return;
    }

    setIsPending(true);

    try {
      const result = await toggleWishlistAction(userId, product.id);

      if (result.success) {
        onToggleWishlist(product.id);

        showTooltip(
          !isWished
            ? 'Added to Wishlist'
            : 'Removed from Wishlist'
        );
      } else {
        showTooltip(result?.error || "Something went wrong");
      }
    } catch (error) {
      showTooltip("Connection error");
    } finally {
      setIsPending(false);
    }
  };

  /* ---------------- TAG CONDITIONS ---------------- */

  const isNewArrival = product?.isNewArrival;
  const isBestSeller = product?.isBestSeller;
  const isLimitedStock = product?.stock <= 5;
  const tagInfo = product?.tag;

  return (
    <div
      className="
        flex flex-col
        bg-[#fffdfd]
        rounded-[28px]
        overflow-hidden
        relative
        group
        border
        border-[#d4af37]
        transition-all
        duration-500
        hover:-translate-y-1
        shadow-[0_10px_35px_rgba(132,13,92,0.10)]
        hover:shadow-[0_16px_40px_rgba(132,13,92,0.14)]

        min-h-[230px]
        md:max-h-[400px]
        h-full
      "
    >

      {/* Tooltip */}
      {tooltip.show && (
        <div className="absolute top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-[#321327] text-[#f7d46b] text-[9px] md:text-[11px] py-2 px-3 font-medium text-center tracking-[0.1em] uppercase">
            {tooltip.msg}
          </div>
        </div>
      )}

      {/* ---------------- TAGS ---------------- */}
      <div className="absolute top-3 left-3 z-40 flex flex-col gap-2">

        {/* NEW ARRIVAL */}
        {isNewArrival && (
          <div
            className="
              bg-[linear-gradient(135deg,#fff6bf_0%,#f7d46b_20%,#d4af37_40%,#fff0a6_60%,#b8860b_100%)]
              text-[#2d1600]
              text-[8px]
              md:text-[10px]
              px-4
              py-1.5
              rounded-full
              font-bold
              uppercase
              tracking-[0.15em]
              shadow-md
            "
          >
            New Arrival
          </div>
        )}

        {/* BEST SELLER */}
        {isBestSeller && (
          <div
            className="
              bg-gradient-to-r
              from-[#840d5c]
              via-[#b3127b]
              to-[#d91b95]
              text-white
              text-[8px]
              md:text-[10px]
              px-4
              py-1.5
              rounded-full
              font-bold
              uppercase
              tracking-[0.15em]
              shadow-md
            "
          >
            ✨ Best Seller
          </div>
        )}

        {/* CUSTOM TAG */}
        {tagInfo && (
          <div
            className="
              bg-[linear-gradient(135deg,#fff6bf_0%,#f7d46b_18%,#d4af37_40%,#fff0a6_52%,#c69214_75%,#8b6914_100%)]
              text-[#3a2500]
              text-[8px]
              md:text-[10px]
              px-4
              py-1.5
              rounded-full
              font-bold
              uppercase
              tracking-[0.15em]
              shadow-md
            "
          >
            {tagInfo}
          </div>
        )}

        {/* LIMITED STOCK */}
        {isLimitedStock && (
          <div
            className="
              bg-gradient-to-r
              from-red-500
              to-red-600
              text-white
              text-[8px]
              md:text-[10px]
              px-4
              py-1.5
              rounded-full
              font-bold
              uppercase
              tracking-[0.15em]
              shadow-md
            "
          >
            Limited Stock
          </div>
        )}
      </div>

      {/* Wishlist */}
      <div className="absolute top-3 right-3 z-40">
        <button
          onClick={handleWishlistClick}
          disabled={isPending}
          className="
            bg-white/95
            backdrop-blur-md
            p-2.5
            rounded-full
            shadow-lg
            transition-all
            duration-300
            hover:scale-110
            hover:bg-[#321327]
            hover:text-[#f7d46b]
          "
        >
          {isWished ? (
            <FaHeart className="text-[#840d5c] text-sm md:text-base" />
          ) : (
            <FaRegHeart className="text-[#321327] text-sm md:text-base" />
          )}
        </button>
      </div>

      {/* PRODUCT IMAGE */}
      <div
        className="
          relative
          w-full
          h-[290px]
          md:h-[290px]
          bg-[#fdf8fb]
          overflow-hidden
          flex
          items-center
          justify-center
          pt-10
          px-4
        "
      >
        <Image
          src={`${IMAGE_BASE_URL}/${product?.image}`}
          alt={product.name}
          fill
          className="
            object-cover
            p-4
          "
        />

        {/* Soft Bottom Fade */}
        <div
          className="
            absolute
            bottom-0
            left-0
            right-0
            h-16
            bg-gradient-to-t
            from-[#fffdfd]
            to-transparent
          "
        />
      </div>

      {/* PRODUCT CONTENT */}
      <div className="flex flex-col flex-1 px-4 pt-2 pb-2">

        {/* Product Title */}
        <h2
          className="
            text-[#2b1021]
            text-[15px]
            md:text-[16px]
            font-semibold
            leading-snug
            line-clamp-2
          "
        >
          {product.name}
        </h2>



        {/* Price */}
        <div className="flex items-end gap-2 mt-3">

          <div className="text-[24px] md:text-[25px] font-bold text-[#840d5c]">
            Rs.{product.price}
          </div>

          {/* <div className="text-xs md:text-sm line-through text-[#a89ca4] mb-1">
            Rs.{product.price + 150}
          </div> */}
        </div>

        {/* Add To Cart */}
        <button
          className="
            mt-4
            w-full
            py-3

            rounded-[18px]

            bg-gradient-to-r
            from-[#321327]
            via-[#5d1040]
            to-[#840d5c]

            text-white
            font-bold
            uppercase
            text-[10px]
            md:text-[11px]
            tracking-[0.22em]

            transition-all
            duration-300

            hover:brightness-110
            hover:text-[#f7d46b]
          "
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};
// --- MAIN PRODUCT GRID COMPONENT ---
const ProductGrid = () => {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id || null;
        setUserId(currentUserId);

        const fetchedProducts = await getAllProducts();
        setProducts(fetchedProducts || []);

        if (currentUserId) {
          const wishlistData = await getWishlist(currentUserId);
          const wishlistIds = wishlistData.map((item: any) => item.productId);
          setWishlist(wishlistIds);
        }
      } catch (error) {
        console.error("Critical error loading grid data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleWishlistInState = (id: string) => {
    setWishlist((prev) => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  return (
    <section className="bg-[#faf3f5] py-8 md:py-16 min-h-screen">
      <div className="max-w-[1440px] mx-auto px-3 md:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-serif text-[#321327]">Our Products</h1>
        </div>

        {loading ? (
           <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#840d5c] border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : (
          /* 
            CHANGES MADE HERE:
            - grid-cols-2: Ensures two cards per row on mobile
            - gap-3: Tighter spacing for mobile screens
            - md:gap-6: Restores original spacing on larger screens
          */
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {products.slice(0, 4).map((product) => (
              <div 
                key={product.id} 
                onClick={() => router.push(`/product/${product.id}`)} 
                className="cursor-pointer"
              >
                <ProductCard 
                  product={product} 
                  isWished={wishlist.includes(product.id)} 
                  onToggleWishlist={toggleWishlistInState} 
                  userId={userId} 
                />
              </div>
            ))}
            
            {products.length > 4 && (
              <div className="col-span-full text-center mt-6 md:mt-4">
                <button 
                  onClick={() => router.push('/shop')} 
                  className="inline-block px-6 py-3 bg-[#321327] text-white font-bold uppercase text-[10px] tracking-[0.2em] hover:text-[#d4af37] transition-colors"
                >
                  View All Products
                </button>
              </div>
            )}

            {products.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-20">
                <PiShirtFolded className="mx-auto mb-4 text-4xl" />
                <p>No products available.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;