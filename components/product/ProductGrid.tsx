"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { MdVerified } from "react-icons/md";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { PiShirtFolded } from "react-icons/pi";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useStore } from "@/store/useStore";
import { getOptimizedSupabaseImageUrl } from "@/lib/supabaseImage";
import {
  getProductColorLabel,
  getProductSwatchColor,
} from "@/lib/productVariants";

// ================= PRODUCT CARD =================

export const ProductCard = ({
  product,
  isWished,
  onToggleWishlist,
  userId,
  swatches = [],
  activeSwatchId,
  onSwatchSelect,
  isComboEligible = false,
  titleOverride,
  subtitleOverride,
}: {
  product: any;
  isWished: boolean;
  onToggleWishlist: (id: string) => void | Promise<void>;
  userId: string | null;
  swatches?: Array<{ id: string; label: string; color: string }>;
  activeSwatchId?: string;
  onSwatchSelect?: (id: string) => void;
  isComboEligible?: boolean;
  titleOverride?: string;
  subtitleOverride?: string;
}) => {
  const [isPending, setIsPending] = useState(false);

  const handleWishlistClick = async (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (!userId) {
      toast.warning("Please login first to add items to your wishlist.");
      return;
    }

    setIsPending(true);

    try {
      await onToggleWishlist(product.id);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  };

  const badgeGroupSlugs = new Set(['badges', 'tags', 'status', 'product-filter']);
  const badgeGroupNames = new Set(['product filter', 'product filters', 'badges', 'tags', 'status']);

  const productBadges = Array.isArray(product?.filters)
    ? product.filters
        .flatMap((filter: any) => {
          const group = filter?.filterOption?.filterGroup;
          const groupSlug = String(group?.slug || '').trim().toLowerCase();
          const groupName = String(group?.displayName || group?.name || '').trim().toLowerCase();

          if (!badgeGroupSlugs.has(groupSlug) && !badgeGroupNames.has(groupName)) {
            return [];
          }

          const label = String(
            filter?.filterOption?.displayLabel || filter?.filterOption?.value || ''
          ).trim();

          return label ? [label] : [];
        })
        .filter(Boolean)
    : [];

  const getBadgeClassName = (badge: string) => {
    const normalized = String(badge || '').trim().toLowerCase();

    if (normalized === 'new arrival') {
      return `
        px-2.5
        py-0.5
        rounded-full
        text-[9px]
        font-bold
        uppercase
        tracking-[0.08em]
        text-[#2f1c06]
        shadow-sm
        border
        border-[#d4af37]/80
        bg-[linear-gradient(135deg,#f8e08a_0%,#e0b84a_45%,#b88722_100%)]
        whitespace-nowrap
      `;
    }

    if (normalized === 'few left') {
      return `
        px-2
        py-0.5
        rounded-full
        text-[9px]
        font-bold
        uppercase
        tracking-[0.08em]
        text-white
        shadow-sm
        border
        border-[#9d155f]/45
        bg-[#9d155f]/55
        backdrop-blur-sm
        whitespace-nowrap
      `;
    }

    return `
      px-2
      py-0.5
      rounded-full
      text-[9px]
      font-bold
      uppercase
      tracking-[0.08em]
      text-white
      shadow-sm
      border
      border-[#9d155f]/45
      bg-[#9d155f]/55
      backdrop-blur-sm
      whitespace-nowrap
    `;
  };

  const renderSwatch = (swatch: { id: string; label: string; color: string }) => {
    const isActive = swatch.id === activeSwatchId;

    return (
      <button
        key={swatch.id}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSwatchSelect?.(swatch.id);
        }}
        className={`h-5 w-5 rounded-full border transition-all shrink-0 ${
          isActive
            ? "border-[#321327] ring-1 ring-[#321327]/30"
            : "border-[#321327]/20 hover:border-[#321327]/45"
        }`}
        style={{ backgroundColor: swatch.color }}
        aria-label={`Show ${swatch.label}`}
        title={swatch.label}
      />
    );
  };

  const currentPrice = Number(product?.price ?? 0);
  const originalPriceCandidate = Number(
    product?.originalPrice ?? product?.mrp ?? product?.compareAtPrice ?? product?.actualPrice ?? 0
  );
  const showOriginalPrice = Number.isFinite(originalPriceCandidate) && originalPriceCandidate > currentPrice;

  return (
    <div
      className="
        relative
        flex
        flex-col
        overflow-hidden
        rounded-[18px]
        bg-white
        border
        border-[#d4af37]
        shadow-[0_4px_18px_rgba(30,10,20,0.06)]
        hover:shadow-[0_12px_28px_rgba(30,10,20,0.14)]
        hover:-translate-y-0.5
        transition-all
        duration-200
        w-full
        group
      "
    >
      {/* WISHLIST */}
      <div className="absolute top-2 right-2 z-40">
        <button
          onClick={handleWishlistClick}
          disabled={isPending}
          className="
            w-8
            h-8
            rounded-full
            bg-white/90
            backdrop-blur-md
            shadow-md
            flex
            items-center
            justify-center
            transition-all
            duration-200
            hover:scale-105
          "
        >
          {isWished ? (
            <FaHeart className="text-[#840d5c] text-sm" />
          ) : (
            <FaRegHeart className="text-[#321327] text-sm" />
          )}
        </button>
      </div>

      {/* IMAGE CONTAINER WITH DEFINED ASPECT RATIO */}
      <div
        className="
          relative
          w-full
          aspect-[3/3.8]
          overflow-hidden
          bg-[#fff7fb]
          shrink-0
        "
      >
        <Image
          src={getOptimizedSupabaseImageUrl(product?.image, { width: 640, quality: 70 })}
          alt={product.name}
          fill
          sizes="640px"
          className="
            object-cover
            object-center
            w-full
            h-full
            transition-transform
            duration-500
            group-hover:scale-105
          "
          priority
        />
        {productBadges.length > 0 && (
          <div className="absolute bottom-2 right-2 z-30 flex flex-col items-end gap-1.5 max-w-[80%]">
            {productBadges.map((badge: string, index: number) => {
              const label = String(badge || '').trim();
              if (!label) return null;

              return (
                <div
                  key={`${label}-${index}`}
                  className={getBadgeClassName(label)}
                >
                  {label}
                </div>
              );
            })}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
      </div>

      {/* CONTENT WITH AUTOMATIC, ACCURATE EXPANSION SPACE */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4 gap-3 bg-white">
        
        {/* TEXT CONTENT WRAPPER */}
        <div className="flex flex-col gap-1.5">
          {/* TITLE */}
          <h2
            className="
              text-[#301425]
              text-[11px]
              sm:text-[14px]
              font-semibold
              leading-tight
              line-clamp-2
              overflow-hidden
            "
          >
            {titleOverride || product.name}
          </h2>

          {/* PRICE */}
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-[13px] sm:text-[16px] font-bold leading-none text-[#8a0f56]">
              ₹ {product.price}
            </span>
            {showOriginalPrice && (
              <span className="text-[10px] sm:text-[12px] font-medium leading-none text-[#8e3a66]/55 line-through">
                ₹ {originalPriceCandidate}
              </span>
            )}
          </div>
        </div>

        {/* SWATCHES SECTION */}
        {swatches.length > 0 && (
          <div className="w-full">
            <div className="overflow-x-auto no-scrollbar md:hidden">
              <div className="flex items-center gap-2 pb-0.5">
                {swatches.map((swatch) => renderSwatch(swatch))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5 flex-wrap">
              {swatches.slice(0, 6).map((swatch) => renderSwatch(swatch))}
              {swatches.length > 6 && (
                <span className="text-[11px] font-semibold text-[#321327]/60 ml-0.5">
                  +{swatches.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        {/* BUTTON ATTACHED WELL TO BOTTOM */}
        <button
          onClick={(e) => {
            // Prevent triggering card click navigation when adding to cart
            e.stopPropagation();
          }}
          className="
            w-full
            h-9
            sm:h-10
            rounded-xl
            border
            border-[#a74879]
            bg-[#8a0f56]
            text-white
            text-[10px]
            sm:text-[11px]
            font-bold
            tracking-[0.12em]
            shadow-sm
            uppercase
            transition-all
            duration-200
            hover:bg-[#6f0c45]
            active:scale-[0.98]
            mt-auto
          "
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

// ================= MAIN GRID =================

const ProductGrid = () => {
  const user = useStore((state) => state.user);
  const cartItems = useStore((state) => state.cartItems);
  const loadProducts = useStore((state) => state.loadProducts);

  const isAuthInitialized = useStore(
    (state) => state.isAuthInitialized
  );

  const products = useStore(
    (state) => state.products
  );

  const isProductsInitialized = useStore(
    (state) => state.isProductsInitialized
  );

  const [isBootstrappingProducts, setIsBootstrappingProducts] = useState(false);

  useEffect(() => {
    if (!isAuthInitialized || isProductsInitialized) return;

    let isMounted = true;
    setIsBootstrappingProducts(true);

    Promise.resolve(loadProducts()).finally(() => {
      if (isMounted) {
        setIsBootstrappingProducts(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthInitialized, isProductsInitialized, loadProducts]);

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

  const comboEligibleCategories = useMemo(() => {
    const categoryQuantities = cartItems.reduce<Record<string, number>>((acc, item) => {
      const rawCategory = item?.category || item?.Product?.category || item?.product?.category;
      const normalizedCategory = typeof rawCategory === 'string' ? rawCategory.trim().toLowerCase() : '';
      if (!normalizedCategory) return acc;
      acc[normalizedCategory] = (acc[normalizedCategory] || 0) + Number(item?.quantity || 1);
      return acc;
    }, {});
    
    return new Set(
      Object.entries(categoryQuantities)
        .filter(([, quantity]) => quantity >= 3)
        .map(([category]) => category)
    );
  }, [cartItems]);

  const isProductComboEligible = (product: any) => {
    const rawCategory = product?.category || product?.Product?.category || product?.product?.category;
    const normalizedCategory = typeof rawCategory === 'string' ? rawCategory.trim().toLowerCase() : '';
    return comboEligibleCategories.has(normalizedCategory);
  };

  const router = useRouter();
  const normalizeText = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const getProductTypeLabel = (product: any) =>
    String(
      product?.productType?.name ||
        product?.category?.name ||
        product?.category ||
        product?.category_name ||
        ""
    ).trim();

  const getProductSubCategoryLabel = (product: any) =>
    String(
      product?.subCategory?.name ||
        product?.subCategoryName ||
        product?.subcategory?.name ||
        ""
    ).trim();

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, { category: string; categoryKey: string; variants: any[] }>();

    for (const product of products || []) {
      if (!product?.id) continue;

      const productType = getProductTypeLabel(product) || "Uncategorized";
      const subCategory = getProductSubCategoryLabel(product) || "Other";
      const categoryKey = `${normalizeText(productType)}::${normalizeText(subCategory)}`;
      const category = subCategory;

      const existing = groups.get(categoryKey);
      if (existing) {
        existing.variants.push(product);
        continue;
      }

      groups.set(categoryKey, {
        category,
        categoryKey,
        variants: [product],
      });
    }

    return Array.from(groups.values());
  }, [products]);

  const featuredGroups = useMemo(
    () => groupedProducts.slice(0, 4),
    [groupedProducts]
  );

  const [selectedVariantByCategory, setSelectedVariantByCategory] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedVariantByCategory((previous) => {
      const next = { ...previous };
      for (const group of groupedProducts) {
        const selectedId = next[group.categoryKey];
        const exists = group.variants.some((variant) => variant.id === selectedId);
        if (!exists) {
          next[group.categoryKey] = group.variants[0]?.id;
        }
      }
      return next;
    });
  }, [groupedProducts]);

  const toggleWishlistInState = async (
    id: string
  ) => {
    if (!user?.id) return;

    await toggleWishlist(user.id, id);
  };

  const loading = !isAuthInitialized || (!isProductsInitialized && isBootstrappingProducts);

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
                gap-4
                md:gap-6
              "
            >
              {featuredGroups.map((group) => {
                const activeVariantId = selectedVariantByCategory[group.categoryKey];
                const activeVariant =
                  group.variants.find((variant) => variant.id === activeVariantId) ||
                  group.variants[0];

                if (!activeVariant) return null;

                return (
                  <div
                    key={group.categoryKey}
                    onClick={() =>
                      router.push(
                        `/product/${activeVariant.id}`,
                        { scroll: true }
                      )
                    }
                    className="cursor-pointer flex h-full"
                  >
                    <ProductCard
                      product={activeVariant}
                      isWished={wishlist.includes(activeVariant.id)}
                      onToggleWishlist={toggleWishlistInState}
                      userId={user?.id || null}
                      swatches={group.variants.map((variant, index) => ({
                        id: variant.id,
                        label: getProductColorLabel(variant, index),
                        color: getProductSwatchColor(variant, index),
                      }))}
                      activeSwatchId={activeVariant.id}
                      onSwatchSelect={(variantId) =>
                        setSelectedVariantByCategory((previous) => ({
                          ...previous,
                          [group.categoryKey]: variantId,
                        }))
                      }
                      isComboEligible={isProductComboEligible(activeVariant)}
                    />
                  </div>
                );
              })}
            </div>

            {/* VIEW ALL */}
            {groupedProducts.length > 4 && (
              <div className="text-center mt-8">
                <button
                  onClick={() =>
                    router.push("/shop/bras")
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