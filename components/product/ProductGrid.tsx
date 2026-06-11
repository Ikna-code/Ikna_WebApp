"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { MdVerified } from "react-icons/md";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { PiShirtFolded } from "react-icons/pi";
import { useRouter } from "next/navigation";

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

        {productBadges.map((badge: string, index: number) => {
          const label = String(badge || '').trim();
          if (!label) return null;

          return (
            <div
              key={`${label}-${index}`}
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
              {label}
            </div>
          );
        })}


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
    fill
    sizes="640px"
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
          {titleOverride || product.name}
        </h2>

        {subtitleOverride && (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#840d5c]/70">
            {subtitleOverride}
          </p>
        )}

    

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

        {swatches.length > 0 && (
          <>
            <div className="mt-2.5 overflow-x-auto no-scrollbar md:hidden">
              <div className="flex items-center gap-2 min-w-max pr-1">
                {swatches.map((swatch) => renderSwatch(swatch))}
              </div>
            </div>

            <div className="mt-2.5 hidden md:flex items-center gap-2">
              {swatches.slice(0, 6).map((swatch) => renderSwatch(swatch))}
              {swatches.length > 6 && (
                <span className="text-[10px] font-semibold text-[#321327]/60">
                  +{swatches.length - 6}
                </span>
              )}
            </div>
          </>
        )}

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

  // Calculate combo eligibility by category
  const comboEligibleCategories = useMemo(() => {
    const categoryQuantities = cartItems.reduce<Record<string, number>>((acc, item) => {
      const rawCategory = item?.category || item?.Product?.category || item?.product?.category;
      const normalizedCategory = typeof rawCategory === 'string' ? rawCategory.trim().toLowerCase() : '';
      if (!normalizedCategory) return acc;
      acc[normalizedCategory] = (acc[normalizedCategory] || 0) + Number(item?.quantity || 1);
      return acc;
    }, {});
    
    // Return set of categories with 3+ items
    return new Set(
      Object.entries(categoryQuantities)
        .filter(([, quantity]) => quantity >= 3)
        .map(([category]) => category)
    );
  }, [cartItems]);

  // Function to check if product is combo eligible
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
                gap-3
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
                    className="cursor-pointer"
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