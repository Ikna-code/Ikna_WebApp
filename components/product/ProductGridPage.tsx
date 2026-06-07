"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LuFilter, LuX } from "react-icons/lu";

import { ProductCard } from "./ProductGrid";
import Footer from "@/components/layout/Footer";
import { useStore } from "@/store/useStore";
import {
  getProductColorLabel,
  getProductSwatchColor,
  groupProductsByCategory,
} from "@/lib/productVariants";

interface ProductGridPageProps {
  products: any[];
  initialCategory?: string;
}

const ProductGridPage: React.FC<ProductGridPageProps> = ({
  products = [],
  initialCategory = "",
}) => {
  const user = useStore((state) => state.user);
  const wishlistItems = useStore((state) => state.wishlist);
  const toggleWishlist = useStore((state) => state.toggleWishlist);

  const wishlist = useMemo(
    () => wishlistItems.map((item: any) => item.id),
    [wishlistItems]
  );

  // FILTER + SORT
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDynamicFilters, setSelectedDynamicFilters] = useState<Record<string, string>>({});
  const [filterMetadata, setFilterMetadata] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>("default");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isDesktopFilterDrawerOpen, setIsDesktopFilterDrawerOpen] = useState<boolean>(false);
  const [isPortalReady, setIsPortalReady] = useState<boolean>(false);

  const router = useRouter();

  // MAIN CATEGORY
  const mainCategoryName = useMemo(() => {
    if (!products.length) return "";
    const firstProduct = products[0];
    const cat =
      firstProduct.category?.name ||
      firstProduct.category ||
      firstProduct.category_name;
    return typeof cat === "string" ? cat : "";
  }, [products]);

  // UNIQUE CATEGORIES
  const uniqueCategories = useMemo(() => {
    const categories = products
      .map(
        (p) =>
          p.category?.name ||
          p.category ||
          p.category_name
      )
      .filter(Boolean);
    return ["All", ...Array.from(new Set(categories))];
  }, [products]);

  const availableDynamicFilterGroups = useMemo(() => {
    const normalize = (value: string) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

    const categorySlug = normalize(selectedCategory);
    const candidateSlugs =
      categorySlug === 'all'
        ? []
        : categorySlug === 'briefs'
          ? ['briefs', 'panties']
          : categorySlug === 'panties'
            ? ['panties', 'briefs']
            : [categorySlug];

    if (!candidateSlugs.length) return [] as Array<{
      id: string;
      slug: string;
      name: string;
      options: Array<{ id: string; label: string }>;
    }>;

    const groupsMap = new Map<string, { id: string; slug: string; name: string; options: Array<{ id: string; label: string }> }>();

    for (const productType of filterMetadata) {
      const productTypeSlug = normalize(productType?.slug || productType?.name || '');
      if (!candidateSlugs.includes(productTypeSlug)) continue;

      const filterGroups = Array.isArray(productType?.filterGroups) ? productType.filterGroups : [];
      for (const group of filterGroups) {
        const groupId = String(group?.id || '');
        if (!groupId) continue;

        const groupEntry = groupsMap.get(groupId) || {
          id: groupId,
          slug: String(group?.slug || groupId),
          name: String(group?.displayName || group?.name || 'Filter'),
          options: [],
        };

        const options = Array.isArray(group?.filterOptions) ? group.filterOptions : [];
        for (const option of options) {
          const optionId = String(option?.id || '');
          if (!optionId || groupEntry.options.some((item) => item.id === optionId)) continue;

          groupEntry.options.push({
            id: optionId,
            label: String(option?.displayLabel || option?.value || 'Option'),
          });
        }

        groupsMap.set(groupId, groupEntry);
      }
    }

    return Array.from(groupsMap.values())
      .map((group) => ({
        ...group,
        options: group.options.sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .filter((group) => group.options.length > 0);
  }, [filterMetadata, selectedCategory]);

  useEffect(() => {
    let isMounted = true;
    const fetchFilterMetadata = async () => {
      try {
        const response = await fetch('/api/filters', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (isMounted) {
          setFilterMetadata(Array.isArray(payload) ? payload : []);
        }
      } catch {
        if (isMounted) {
          setFilterMetadata([]);
        }
      }
    };
    void fetchFilterMetadata();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  useEffect(() => {
    const isAnyFilterDrawerOpen = isFilterDrawerOpen || isDesktopFilterDrawerOpen;
    if (!isAnyFilterDrawerOpen) {
      document.body.classList.remove("ikna-modal-open");
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("ikna-modal-open");

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.classList.remove("ikna-modal-open");
    };
  }, [isFilterDrawerOpen, isDesktopFilterDrawerOpen]);

  useEffect(() => {
    const normalizedInitialCategory = String(initialCategory || '').trim().toLowerCase();
    if (!normalizedInitialCategory) {
      setSelectedCategory('All');
      return;
    }
    const matchedCategory = uniqueCategories.find(
      (cat) => String(cat || '').toLowerCase() === normalizedInitialCategory
    );
    setSelectedCategory(matchedCategory || 'All');
  }, [initialCategory, uniqueCategories]);

  useEffect(() => {
    const validGroups = new Set(availableDynamicFilterGroups.map((group) => group.slug));
    const validOptions = new Set(
      availableDynamicFilterGroups.flatMap((group) => group.options.map((option) => option.id))
    );

    setSelectedDynamicFilters((current) => {
      const next: Record<string, string> = {};
      for (const [groupSlug, optionId] of Object.entries(current)) {
        if (validGroups.has(groupSlug) && validOptions.has(optionId)) {
          next[groupSlug] = optionId;
        }
      }
      return next;
    });
  }, [availableDynamicFilterGroups]);

  // FILTERED + SORTED PRODUCTS
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== "All") {
      result = result.filter((p) => {
        const cat = p.category?.name || p.category || p.category_name;
        return cat === selectedCategory;
      });
    }

    const activeDynamicFilters = Object.entries(selectedDynamicFilters).filter(([, optionId]) => optionId);
    if (activeDynamicFilters.length) {
      result = result.filter((product) => {
        const assignments = Array.isArray(product?.filters) ? product.filters : [];
        return activeDynamicFilters.every(([groupSlug, optionId]) =>
          assignments.some((assignment: any) => {
            const option = assignment?.filterOption;
            const group = option?.filterGroup;
            return String(group?.slug || '') === groupSlug && String(option?.id || '') === optionId;
          })
        );
      });
    }

    if (sortBy === "price-low") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "name-az") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return result;
  }, [products, selectedCategory, selectedDynamicFilters, sortBy]);

  const groupedProducts = useMemo(
    () => groupProductsByCategory(filteredAndSortedProducts),
    [filteredAndSortedProducts]
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

  const handleLocalToggle = async (id: string) => {
    if (!user?.id) return;
    await toggleWishlist(user.id, id);
  };

  // Reusable inner markup wrapper for clean rendering across drawers
  const FilterFormControls = ({ isMobile = false }) => (
    <div className="flex flex-col gap-5">
      {/* Category Filter */}
      <div className="flex flex-col gap-2">
        <label htmlFor={`filter-${isMobile ? 'mobile' : 'desktop'}`} className="text-xs font-bold tracking-widest text-[#321327] uppercase">
          Product Type
        </label>
        <select
          id={`filter-${isMobile ? 'mobile' : 'desktop'}`}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#faf6f8] border border-[#321327]/10 rounded-xl px-3 py-2.5 text-xs text-[#321327] outline-none focus:border-[#840d5c] transition w-full"
        >
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Dynamic Attributes Filters */}
      {availableDynamicFilterGroups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <label htmlFor={`dynamic-filter-${isMobile ? 'mobile' : 'desktop'}-${group.id}`} className="text-xs font-bold tracking-widest text-[#321327] uppercase">
            {group.name}
          </label>
          <select
            id={`dynamic-filter-${isMobile ? 'mobile' : 'desktop'}-${group.id}`}
            value={selectedDynamicFilters[group.slug] || ""}
            onChange={(e) =>
              setSelectedDynamicFilters((current) => ({
                ...current,
                [group.slug]: e.target.value,
              }))
            }
            className="bg-[#faf6f8] border border-[#321327]/10 rounded-xl px-3 py-2.5 text-xs text-[#321327] outline-none focus:border-[#840d5c] transition w-full"
          >
            <option value="">All {group.name}s</option>
            {group.options.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
      ))}

      {/* Sort Parameter */}
      <div className="flex flex-col gap-2">
        <label htmlFor={`sort-${isMobile ? 'mobile' : 'desktop'}`} className="text-xs font-bold tracking-widest text-[#321327] uppercase">
          Sort By
        </label>
        <select
          id={`sort-${isMobile ? 'mobile' : 'desktop'}`}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-[#faf6f8] border border-[#321327]/10 rounded-xl px-3 py-2.5 text-xs text-[#321327] outline-none focus:border-[#840d5c] transition w-full"
        >
          <option value="default">Featured</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="name-az">Name: A-Z</option>
        </select>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-[#fdf8fa] flex flex-col">
        
        {/* HEADER */}
        <header className="container mx-auto px-4 md:px-8 pt-8 pb-4 text-center">
          <h1 className="text-3xl md:text-5xl font-serif text-[#321327] mb-3">
            Explore the Collection
          </h1>
          <p className="text-xs md:text-sm tracking-[0.25em] text-[#840d5c] uppercase font-semibold mb-3">
            Engineered for Comfort, Designed for You
          </p>
        </header>

        {/* FILTER ACTION BAR */}
        <section className="container mx-auto px-4 md:px-8 mb-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia("(min-width: 768px)").matches) {
                  setIsDesktopFilterDrawerOpen(true);
                  return;
                }
                setIsFilterDrawerOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#321327]/10 bg-[#faf6f8] px-4 py-3 text-xs font-semibold tracking-[0.12em] text-[#321327] uppercase"
            >
              <LuFilter className="text-[#840d5c] text-base" aria-hidden="true" />
              Filters & Sort
            </button>
          </div>
        </section>

        {/* CORE INTERFACE GRID */}
        <div className="container mx-auto px-4 md:px-8 grow pb-20">
          {/* PRODUCT LISTING CONTAINER */}
          <main className="grow">
            {groupedProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {groupedProducts.map((group) => {
                  const activeVariantId = selectedVariantByCategory[group.categoryKey];
                  const activeVariant =
                    group.variants.find((variant) => variant.id === activeVariantId) ||
                    group.variants[0];

                  if (!activeVariant) return null;

                  return (
                    <div
                      key={group.categoryKey}
                      className="group cursor-pointer bg-white rounded-[28px] overflow-hidden border border-[#f1d9e8] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300"
                      onClick={() =>
                        router.push(
                          `/product/${activeVariant.id}`,
                          { scroll: true }
                        )
                      }
                    >
                      <ProductCard
                        product={activeVariant}
                        isWished={wishlist.includes(activeVariant.id)}
                        onToggleWishlist={handleLocalToggle}
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
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <h3 className="text-2xl font-serif text-[#321327] mb-3">
                  No Products Found
                </h3>
                <p className="text-[#321327]/60 text-sm">
                  Try switching your filters or using another keyword.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {isPortalReady && createPortal(
        <>
          {/* MOBILE: BOTTOM SHEET */}
          <div
            className={`md:hidden fixed inset-0 z-220 transition-opacity duration-300 ${
              isFilterDrawerOpen ? "bg-black/15 backdrop-blur-sm opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setIsFilterDrawerOpen(false)}
          >
            <div
              className={`absolute bottom-0 left-0 right-0 max-h-[82vh] rounded-t-[28px] bg-[#F9F3F5] shadow-2xl transition-transform duration-300 ease-in-out ${
                isFilterDrawerOpen ? "translate-y-0" : "translate-y-full"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-[#321327]/20" aria-hidden="true" />
              <div className="flex items-center justify-between border-b border-[#840d5c]/10 px-5 py-4">
                <span className="text-xs font-bold tracking-[0.2em] text-[#321327] uppercase">Filters</span>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="text-[#321327]"
                  aria-label="Close filters bottom sheet"
                >
                  <LuX size={22} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[calc(82vh-62px)]">
                <FilterFormControls isMobile={true} />
              </div>
            </div>
          </div>

          {/* DESKTOP: RIGHT DRAWER */}
          <div
            className={`hidden md:block fixed inset-0 z-220 transition-opacity duration-300 ${
              isDesktopFilterDrawerOpen ? "bg-black/15 backdrop-blur-sm opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setIsDesktopFilterDrawerOpen(false)}
          >
            <div
              className={`absolute right-0 top-0 h-full w-105 max-w-[92vw] bg-[#F9F3F5] shadow-2xl transition-transform duration-300 ease-in-out ${
                isDesktopFilterDrawerOpen ? "translate-x-0" : "translate-x-full"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#840d5c]/10 px-6 py-5">
                <span className="text-xs font-bold tracking-[0.2em] text-[#321327] uppercase">Filters</span>
                <button
                  type="button"
                  onClick={() => setIsDesktopFilterDrawerOpen(false)}
                  className="text-[#321327]"
                  aria-label="Close filters drawer"
                >
                  <LuX size={22} />
                </button>
              </div>
              <div className="h-[calc(100%-72px)] overflow-y-auto p-6">
                <FilterFormControls isMobile={false} />
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      <Footer />
    </>
  );
};

export default ProductGridPage;