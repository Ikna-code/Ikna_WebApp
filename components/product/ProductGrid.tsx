"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { MdVerified } from "react-icons/md";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { PiShirtFolded } from "react-icons/pi";
import { useRouter } from "next/navigation";

import { useStore } from "@/store/useStore";
import { getOptimizedSupabaseImageUrl } from "@/lib/supabaseImage";

// ================= PRODUCT CARD =================

export const ProductCard = ({
  product,
  isWished,
  onToggleWishlist,
  userId,
}: {
  product: any;
  isWished: boolean;
  onToggleWishlist: (id: string) => void | Promise<void>;
  userId: string | null;
}) => {
  const [tooltip, setTooltip] = useState({
    show: false,
    msg: "",
  });

  const [isPending, setIsPending] = useState(false);

  const showTooltip = (msg: string) => {
    setTooltip({
      show: true,
      msg,
    });

    setTimeout(() => {
      setTooltip({
        show: false,
        msg: "",
      });
    }, 2200);
  };

  const handleWishlistClick = async (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (!userId) {
      showTooltip("Please login first");
      return;
    }

    setIsPending(true);

    try {
      await onToggleWishlist(product.id);

      showTooltip(
        !isWished
          ? "Added to Wishlist"
          : "Removed from Wishlist"
      );
    } catch {
      showTooltip("Something went wrong");
    } finally {
      setIsPending(false);
    }
  };

  const isNewArrival = product?.isNewArrival;
  const isBestSeller = product?.isBestSeller;
  const isLimitedStock = product?.stock <= 5;
  const tagInfo = product?.tag;

  return (
    <div
      className="
        relative
        flex
        flex-col
        overflow-hidden
        rounded-[22px]
        bg-white
        border
        border-[#f0d8e4]
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
        hover:shadow-[0_8px_30px_rgba(132,13,92,0.12)]
        transition-all
        duration-300
        h-full
      "
    >
      {/* TOOLTIP */}
      {tooltip.show && (
        <div className="absolute top-0 left-0 right-0 z-50">
          <div
            className="
              bg-[#321327]
              text-[#f7d46b]
              text-[9px]
              py-2
              text-center
              uppercase
              tracking-[0.15em]
              font-semibold
            "
          >
            {tooltip.msg}
          </div>
        </div>
      )}

      {/* BADGES */}
      <div className="absolute top-2 left-2 z-40 flex flex-col gap-1.5 max-w-[75%]">

        {isNewArrival && (
          <div
            className="
              px-2.5
              py-1
              rounded-full
              text-[8px]
              font-bold
              uppercase
              tracking-[0.12em]
              text-[#2d1600]
              shadow-md
              bg-[linear-gradient(135deg,#fff6bf_0%,#f7d46b_20%,#d4af37_40%,#fff0a6_60%,#b8860b_100%)]
            "
          >
            New
          </div>
        )}

        {isBestSeller && (
          <div
            className="
              px-2.5
              py-1
              rounded-full
              text-[8px]
              font-bold
              uppercase
              tracking-[0.12em]
              text-white
              shadow-md
              bg-gradient-to-r
              from-[#840d5c]
              to-[#d91b95]
            "
          >
            Bestseller
          </div>
        )}

        {tagInfo && (
          <div
            className="
              px-2.5
              py-1
              rounded-full
              text-[8px]
              font-bold
              uppercase
              tracking-[0.12em]
              text-[#3a2500]
              shadow-md
              bg-[linear-gradient(135deg,#fff6bf_0%,#f7d46b_18%,#d4af37_40%,#fff0a6_52%,#c69214_75%,#8b6914_100%)]
            "
          >
            {tagInfo}
          </div>
        )}

        {isLimitedStock && (
          <div
            className="
              px-2.5
              py-1
              rounded-full
              text-[8px]
              font-bold
              uppercase
              tracking-[0.12em]
              text-white
              shadow-md
              bg-gradient-to-r
              from-red-500
              to-red-600
            "
          >
            Few Left
          </div>
        )}
      </div>

      {/* WISHLIST */}
      <div className="absolute top-2 right-2 z-40">
        <button
          onClick={handleWishlistClick}
          disabled={isPending}
          className="
            w-9
            h-9
            rounded-full
            bg-white/95
            backdrop-blur-md
            shadow-lg
            flex
            items-center
            justify-center
            transition-all
            duration-300
            hover:scale-110
          "
        >
          {isWished ? (
            <FaHeart className="text-[#840d5c] text-sm" />
          ) : (
            <FaRegHeart className="text-[#321327] text-sm" />
          )}
        </button>
      </div>

      {/* IMAGE */}
  <div
  className="
    relative
    w-full
    h-[150px]
    sm:h-[220px]
    overflow-hidden
    bg-[#fcf8fa]
  "
>
  <Image
    src={getOptimizedSupabaseImageUrl(product?.image, { width: 640, quality: 70 })}
    alt={product.name}
    fill // 1. Added fill back so Next.js knows to occupy the parent container
    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" // 2. Tells the browser how much space it takes up
    className="
      object-cover
      w-full
      h-full
      transition-transform
      duration-500
      group-hover:scale-105
    "
  />

  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
</div>
      {/* CONTENT */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3">

        {/* TITLE */}
        <h2
          className="
            text-[#2b1021]
            text-[12px]
            sm:text-[15px]
            font-semibold
            leading-snug
            line-clamp-2
          "
        >
          {product.name}
        </h2>

    

        {/* PRICE */}
        <div className="mt-3">
          <div
            className="
              text-[22px]
              sm:text-[24px]
              font-bold
              text-[#840d5c]
              leading-none
            "
          >
            ₹ {product.price}
          </div>
        </div>

        {/* BUTTON */}
        <button
          className="
            mt-2
            h-9
            w-full
            rounded-full
            bg-gradient-to-r
            from-[#3a001f]
            via-[#700044]
            to-[#b0006d]
            text-white
            text-[10px]
            sm:text-[11px]
            font-bold
            tracking-[0.15em]
            uppercase
            transition-all
            duration-300
            hover:brightness-110
          "
        >
          Add To Cart
        </button>
      </div>
    </div>
  );
};

// ================= MAIN GRID =================

const ProductGrid = () => {
  const user = useStore((state) => state.user);

  const isAuthInitialized = useStore(
    (state) => state.isAuthInitialized
  );

  const products = useStore(
    (state) => state.products
  );

  const isProductsInitialized = useStore(
    (state) => state.isProductsInitialized
  );

  const wishlistItems = useStore(
    (state) => state.wishlist
  );

  const toggleWishlist = useStore(
    (state) => state.toggleWishlist
  );

  const wishlist = useMemo(
    () =>
      wishlistItems.map((item: any) => item.id),
    [wishlistItems]
  );

  const router = useRouter();

  const toggleWishlistInState = async (
    id: string
  ) => {
    if (!user?.id) return;

    await toggleWishlist(user.id, id);
  };

  const loading =
    !isProductsInitialized ||
    !isAuthInitialized;

  return (
    <section className="bg-[#faf3f5] py-8 md:py-14 min-h-screen">

      <div className="max-w-[1440px] mx-auto px-3 md:px-8">

        {/* TITLE */}
        <div className="text-center mb-8 md:mb-12">

          <h1 className="text-2xl md:text-4xl font-serif text-[#321327]">
            Our Products
          </h1>

        </div>

        {loading ? (

          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#840d5c] border-t-transparent rounded-full animate-spin"></div>
          </div>

        ) : (

          <>
            {/* GRID */}
            <div
              className="
                grid
                grid-cols-2
                md:grid-cols-4
                lg:grid-cols-4
                gap-3
                md:gap-6
              "
            >
              {products
                .slice(0, 4)
                .map((product) => (

                  <div
                    key={product.id}
                    onClick={() =>
                      router.push(
                        `/product/${product.id}`
                      )
                    }
                    className="cursor-pointer"
                  >
                    <ProductCard
                      product={product}
                      isWished={wishlist.includes(
                        product.id
                      )}
                      onToggleWishlist={
                        toggleWishlistInState
                      }
                      userId={user?.id || null}
                    />
                  </div>

                ))}
            </div>

            {/* VIEW ALL */}
            {products.length > 4 && (
              <div className="text-center mt-8">

                <button
                  onClick={() =>
                    router.push("/shop")
                  }
                  className="
                    inline-flex
                    items-center
                    justify-center
                    px-7
                    h-12
                    rounded-full
                    bg-[#321327]
                    text-white
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-[0.18em]
                    transition-all
                    hover:text-[#d4af37]
                  "
                >
                  View All Products
                </button>

              </div>
            )}

            {/* EMPTY */}
            {products.length === 0 && (
              <div className="text-center text-gray-500 py-20">

                <PiShirtFolded className="mx-auto mb-4 text-4xl" />

                <p>No products available.</p>

              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;