"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { ProductCard } from "./ProductGrid";
import { getWishlist } from "@/backend/actions/order";
import { createClient } from "@/backend/lib/supabaseClient";
import Footer from "@/components/layout/Footer";

interface ProductGridPageProps {
  products: any[];
}

const ProductGridPage: React.FC<ProductGridPageProps> = ({
  products = [],
}) => {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter and Sort states
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("default");

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
          setWishlist(wishIds);
        }
      } catch (error) {
        console.error("Critical error loading wishlist:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, []);

  // Determine the searched/main category based on the initial products list
  const mainCategoryName = useMemo(() => {
    if (!products.length) return "";
    // Dynamically checks for standard property names (category, category_name, etc.)
    const firstProduct = products[0];
    const cat = firstProduct.category?.name || firstProduct.category || firstProduct.category_name;
    return typeof cat === "string" ? cat : "";
  }, [products]);

  // Extract unique subcategories/categories for the local filter menu dropdown
  const uniqueCategories = useMemo(() => {
    const categories = products.map((p) => p.category?.name || p.category || p.category_name).filter(Boolean);
    return ["All", ...Array.from(new Set(categories))];
  }, [products]);

  // Process filtering and sorting efficiently on the client side
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // 1. Filter
    if (selectedCategory !== "All") {
      result = result.filter((p) => {
        const cat = p.category?.name || p.category || p.category_name;
        return cat === selectedCategory;
      });
    }

    // 2. Sort
    if (sortBy === "price-low") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "name-az") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return result;
  }, [products, selectedCategory, sortBy]);

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
    <>
      <div className="bg-[#F9F3F5] min-h-screen flex flex-col">
        
        {/* HEADER */}
        <header className="container mx-auto px-4 md:px-8 py-6 text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-[#321327] mb-4">
            Explore the Collection
          </h1>

          <p className="text-sm tracking-widest text-[#840d5c] uppercase font-bold mb-4">
            Engineered for Comfort, Designed for You
          </p>

          {/* DYNAMIC PRODUCT COUNT & CATEGORY DISPLAY */}
          <p className="text-sm text-[#321327]/70 font-medium">
            {filteredAndSortedProducts.length} Product
            {filteredAndSortedProducts.length !== 1 ? "s" : ""}{" "}
            Found
            {mainCategoryName && ` in "${mainCategoryName}"`}
          </p>
        </header>

        {/* CONTROLS (FILTER & SORT) */}
        <section className="container mx-auto px-4 md:px-8 mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-[#321327]/10 pb-6">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="filter" className="text-xs uppercase tracking-wider text-[#321327]/60 font-bold">
              Filter:
            </label>
            <select
              id="filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-[#321327]/20 rounded px-3 py-1.5 text-sm text-[#321327] outline-none focus:border-[#840d5c] w-full sm:w-48 transition"
            >
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <label htmlFor="sort" className="text-xs uppercase tracking-wider text-[#321327]/60 font-bold">
              Sort By:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-[#321327]/20 rounded px-3 py-1.5 text-sm text-[#321327] outline-none focus:border-[#840d5c] w-full sm:w-48 transition"
            >
              <option value="default">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </section>

        {/* PRODUCT GRID */}
        <main className="w-full px-4 md:px-8 flex-grow pb-20">
          {filteredAndSortedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 md:gap-x-8 md:gap-y-10">
              {filteredAndSortedProducts.map((product) => (
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
                Try switching your filters or using another keyword.
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