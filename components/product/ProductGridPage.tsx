"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LuFilter, LuArrowUpDown } from "react-icons/lu";

import { ProductCard } from "./ProductGrid";
import Footer from "@/components/layout/Footer";
import { useStore } from "@/store/useStore";

interface ProductGridPageProps {
  products: any[];
}

const ProductGridPage: React.FC<ProductGridPageProps> = ({
  products = [],
}) => {
  const user = useStore((state) => state.user);
  const allProducts = useStore((state) => state.products);
  const wishlistItems = useStore((state) => state.wishlist);
  const toggleWishlist = useStore((state) => state.toggleWishlist);

  const wishlist = useMemo(
    () => wishlistItems.map((item: any) => item.id),
    [wishlistItems]
  );

  // FILTER + SORT
  const [selectedCategory, setSelectedCategory] =
    useState<string>("All");

  const [sortBy, setSortBy] = useState<string>("default");

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
    const categorySource =
      allProducts.length > 0 ? allProducts : products;

    const categories = categorySource
      .map(
        (p) =>
          p.category?.name ||
          p.category ||
          p.category_name
      )
      .filter(Boolean);

    return ["All", ...Array.from(new Set(categories))];
  }, [allProducts, products]);

  // FILTERED + SORTED PRODUCTS
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // FILTER
    if (selectedCategory !== "All") {
      result = result.filter((p) => {
        const cat =
          p.category?.name ||
          p.category ||
          p.category_name;

        return cat === selectedCategory;
      });
    }

    // SORT
    if (sortBy === "price-low") {
      result.sort(
        (a, b) => (a.price || 0) - (b.price || 0)
      );
    } else if (sortBy === "price-high") {
      result.sort(
        (a, b) => (b.price || 0) - (a.price || 0)
      );
    } else if (sortBy === "name-az") {
      result.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
    }

    return result;
  }, [products, selectedCategory, sortBy]);

  // WISHLIST
  const handleLocalToggle = async (id: string) => {
    if (!user?.id) return;

    await toggleWishlist(user.id, id);
  };

  return (
    <>
      <div className="min-h-screen bg-[#fdf8fa] flex flex-col">
        
        {/* HEADER */}
        <header className="container mx-auto px-4 md:px-8 pt-8 pb-6 text-center">
          
          <h1 className="text-3xl md:text-5xl font-serif text-[#321327] mb-3">
            Explore the Collection
          </h1>

          <p className="text-xs md:text-sm tracking-[0.25em] text-[#840d5c] uppercase font-semibold mb-3">
            Engineered for Comfort, Designed for You
          </p>

          <p className="text-sm text-[#321327]/70 font-medium">
            {filteredAndSortedProducts.length} Product
            {filteredAndSortedProducts.length !== 1
              ? "s"
              : ""}{" "}
            Found
            {mainCategoryName &&
              ` in "${mainCategoryName}"`}
          </p>
        </header>

        {/* FILTERS */}
        <section className="container mx-auto px-4 md:px-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
            
            {/* FILTER */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <LuFilter className="text-[#840d5c] text-base shrink-0" aria-hidden="true" />
              <label
                htmlFor="filter"
                className="sr-only"
              >
                Filter
              </label>

              <select
                id="filter"
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value)
                }
                className="
                  bg-[#faf6f8]
                  border
                  border-[#321327]/10
                  rounded-xl
                  px-3
                  sm:px-4
                  py-2
                  text-xs
                  sm:text-sm
                  text-[#321327]
                  outline-none
                  focus:border-[#840d5c]
                  transition
                  w-full
                  min-w-0
                  sm:w-52
                "
              >
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* SORT */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <LuArrowUpDown className="text-[#840d5c] text-base shrink-0" aria-hidden="true" />
              <label
                htmlFor="sort"
                className="sr-only"
              >
                Sort
              </label>

              <select
                id="sort"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value)
                }
                className="
                  bg-[#faf6f8]
                  border
                  border-[#321327]/10
                  rounded-xl
                  px-3
                  sm:px-4
                  py-2
                  text-xs
                  sm:text-sm
                  text-[#321327]
                  outline-none
                  focus:border-[#840d5c]
                  transition
                  w-full
                  min-w-0
                  sm:w-52
                "
              >
                <option value="default">
                  Featured
                </option>

                <option value="price-low">
                  Price: Low to High
                </option>

                <option value="price-high">
                  Price: High to Low
                </option>

                <option value="name-az">
                  Name: A-Z
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* PRODUCT GRID */}
        <main className="w-full px-0 md:px-8 flex-grow pb-20">
          {filteredAndSortedProducts.length > 0 ? (
            <div
              className="
  grid
grid-cols-2
lg:grid-cols-3
xl:grid-cols-4
gap-3
md:gap-6
              "
            >
              {filteredAndSortedProducts.map(
                (product) => (
                  <div
                    key={product.id}
                    className="
                      group
                      cursor-pointer
                      bg-white
                      rounded-[28px]
                      overflow-hidden
                      border
                      border-[#f1d9e8]
                      shadow-[0_4px_20px_rgba(0,0,0,0.05)]
                      hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)]
                      hover:-translate-y-1
                      transition-all
                      duration-300
                    "
                    onClick={() =>
                      router.push(
                        `/product/${product.id}`
                      )
                    }
                  >
                    <ProductCard
                      product={product}
                      isWished={wishlist.includes(
                        product.id
                      )}
                      onToggleWishlist={
                        handleLocalToggle
                      }
                      userId={user?.id || null}
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              
              <h3 className="text-2xl font-serif text-[#321327] mb-3">
                No Products Found
              </h3>

              <p className="text-[#321327]/60 text-sm">
                Try switching your filters or using
                another keyword.
              </p>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </>
  );
};

export default ProductGridPage;