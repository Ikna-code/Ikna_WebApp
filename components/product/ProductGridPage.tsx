"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LuFilter, LuX } from "react-icons/lu";

import { ProductCard } from "./ProductGrid";
import Footer from "@/components/layout/Footer";
import { useStore } from "@/store/useStore";
import {
  getProductColorLabel,
  getProductSwatchColor,
} from "@/lib/productVariants";

interface ProductGridPageProps {
  products: any[];
  initialCategory?: string;
}

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

const UpwardSelect = ({
  value,
  options,
  onChange,
  openDirection = "down",
}: {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  openDirection?: "up" | "down";
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const selectedLabel = options.find((option) => option.value === value)?.label || options[0]?.label || "Select";

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="w-full bg-[#faf6f8] border border-[#321327]/10 rounded-xl px-3 py-2.5 text-xs text-[#321327] outline-none transition flex items-center justify-between"
      >
        <span className="truncate pr-3">{selectedLabel}</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className={`absolute left-0 right-0 z-50 max-h-56 overflow-y-auto rounded-xl border border-[#321327]/10 bg-[#faf6f8] shadow-lg ${openDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"}`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="w-full px-3 py-2.5 text-left text-xs text-[#321327] hover:bg-[#f2e4ea]"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductGridPage: React.FC<ProductGridPageProps> = ({
  products = [],
  initialCategory = "",
}) => {
  const user = useStore((state) => state.user);
  const cartItems = useStore((state) => state.cartItems);
  const wishlistItems = useStore((state) => state.wishlist);
  const toggleWishlist = useStore((state) => state.toggleWishlist);

  const wishlist = useMemo(
    () => wishlistItems.map((item: any) => item.id),
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

  // FILTER + SORT
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("");
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
      .map((p) => getProductTypeLabel(p))
      .filter(Boolean);
    return ["All", ...Array.from(new Set(categories))];
  }, [products]);

  const availableDynamicFilterGroups = useMemo(() => {
    // If "All" selected, return empty (no category-specific filters)
    if (selectedCategory === "All") {
      return [] as Array<{
        id: string;
        slug: string;
        name: string;
        options: Array<{ id: string; label: string }>;
      }>;
    }

    // Find the product type metadata for selected category
    const categoryMetadata = filterMetadata.find((type: any) => 
      normalizeText(type.name) === normalizeText(selectedCategory)
    );

    if (!categoryMetadata || !Array.isArray(categoryMetadata.filterGroups)) {
      return [] as Array<{
        id: string;
        slug: string;
        name: string;
        options: Array<{ id: string; label: string }>;
      }>;
    }

    // Convert metadata filter groups to the format we need
    return categoryMetadata.filterGroups
      .map((group: any) => ({
        id: String(group?.id || ''),
        slug: String(group?.slug || ''),
        name: String(group?.displayName || group?.name || 'Filter'),
        options: (Array.isArray(group?.filterOptions) ? group.filterOptions : []).map((option: any) => ({
          id: String(option?.id || ''),
          label: String(option?.displayLabel || option?.value || 'Option'),
        })),
      }))
      .filter((group: any) => group.options.length > 0)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [filterMetadata, selectedCategory]);

  // Get subcategories for the selected category
  const availableSubCategories = useMemo(() => {
    if (selectedCategory === "All") return [];
    
    // Find the product type metadata for selected category
    const categoryMetadata = filterMetadata.find((type: any) => 
      normalizeText(type.name) === normalizeText(selectedCategory)
    );

    if (!categoryMetadata || !Array.isArray(categoryMetadata.subCategories)) {
      return [];
    }

    return categoryMetadata.subCategories.map((sub: any) => sub.name).sort();
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
    const validGroups = new Set(availableDynamicFilterGroups.map((group: any) => group.slug));
    const validOptions = new Set(
      availableDynamicFilterGroups.flatMap((group: any) => group.options.map((option: any) => option.id))
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
        const productType = getProductTypeLabel(p);
        return normalizeText(productType) === normalizeText(selectedCategory);
      });
    }

    if (selectedSubCategory) {
      result = result.filter((p) => {
        const subCategory = getProductSubCategoryLabel(p);
        return normalizeText(subCategory) === normalizeText(selectedSubCategory);
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
  }, [products, selectedCategory, selectedSubCategory, selectedDynamicFilters, sortBy]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, { category: string; categoryKey: string; variants: any[] }>();

    for (const product of filteredAndSortedProducts) {
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
  }, [filteredAndSortedProducts]);

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
      {/* Category Display */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold tracking-widest text-[#321327] uppercase">
          Product Type
        </label>
        <div className="bg-[#faf6f8] border border-[#321327]/10 rounded-xl px-3 py-2.5 text-xs text-[#321327]">
          {selectedCategory === "All" ? "All Categories" : selectedCategory}
        </div>
      </div>

      {/* Subcategory Filter */}
      {selectedCategory !== "All" && availableSubCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-widest text-[#321327] uppercase">
            Subcategory
          </label>
          <UpwardSelect
            value={selectedSubCategory}
            onChange={setSelectedSubCategory}
            options={[
              { label: "All Subcategories", value: "" },
              ...availableSubCategories.map((subCat: any) => ({ label: subCat, value: subCat })),
            ]}
          />
        </div>
      )}

      {/* Dynamic Attributes Filters */}
      {availableDynamicFilterGroups.map((group: any) => (
        <div key={group.id} className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-widest text-[#321327] uppercase">
            {group.name}
          </label>
          <UpwardSelect
            value={selectedDynamicFilters[group.slug] || ""}
            onChange={(nextValue) =>
              setSelectedDynamicFilters((current) => ({
                ...current,
                [group.slug]: nextValue,
              }))
            }
            options={[
              { label: `All ${group.name}s`, value: "" },
              ...group.options.map((option: any) => ({ label: option.label, value: option.id })),
            ]}
          />
        </div>
      ))}

      {/* Sort Parameter */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold tracking-widest text-[#321327] uppercase">
          Sort By
        </label>
        <UpwardSelect
          value={sortBy}
          onChange={setSortBy}
          openDirection={isMobile ? "up" : "down"}
          options={[
            { label: "Featured", value: "default" },
            { label: "Price: Low to High", value: "price-low" },
            { label: "Price: High to Low", value: "price-high" },
            { label: "Name: A-Z", value: "name-az" },
          ]}
        />
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
                        subtitleOverride={`${group.variants.length} item${group.variants.length > 1 ? 's' : ''}`}
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
                        isComboEligible={isProductComboEligible(activeVariant)}
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
              className={`absolute bottom-0 left-0 right-0 max-h-[88vh] rounded-t-[28px] bg-[#F9F3F5] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
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
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
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