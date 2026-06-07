"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Tag } from "lucide-react";
import { cn } from "@/utils/cn";

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Read current search param directly from URL to keep source of truth synchronized
  const currentSearchParam = searchParams.get("search") || "";
  const [query, setQuery] = useState(currentSearchParam);

  // Sync state whenever URL parameter changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery(currentSearchParam);
      inputRef.current?.focus();
      document.body.style.overflow = "hidden";
      document.body.classList.add("ikna-modal-open");
    } else {
      document.body.style.overflow = "unset";
      document.body.classList.remove("ikna-modal-open");
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("ikna-modal-open");
    };
  }, [isOpen, currentSearchParam]);

  // ESC key close
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Static product categories list - always fully visible now
  const braProducts = [
    { text: "Barely there - Light padded", type: "light padded" },
    { text: "Non-wired cotton bra", type: "cotton bra" },
    { text: "Barely There Bridgerton limited edition", type: "limited edition" },
    { text: "COMFY SUPPORTIVE MINIMIZER BRA", type: "minimizer bra" },
    { text: "EVERYDAY WEAR COMFY BRA", type: "everyday wear" },
    { text: "PADDED BRA", type: "padded bra" },
    { text: "SIDE NET COVERAGE BRA", type: "coverage bra" },
  ];

  // Global routing updater
  const updateSearchRoute = (searchText: string) => {
    if (searchText.trim() === "") {
      router.push("/shop");
    } else {
      const encodedQuery = encodeURIComponent(searchText);
      router.push(`/shop?search=${encodedQuery}`);
    }
  };

  // Handles typing transitions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    updateSearchRoute(val);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchRoute(query);
    onClose(); 
  };

  // Handles clicking the 'X' button explicitly
  const handleClearSearch = () => {
    setQuery("");
    updateSearchRoute(""); 
    inputRef.current?.focus();
  };

  return (
    <>
      {/* BACKDROP */}
      <div
        className={cn(
          "fixed inset-0 bg-black/15 backdrop-blur-sm z-[220] transition-all duration-300",
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={onClose}
      />

      {/* SIDEBAR */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:max-w-[450px] bg-[#F9F3F5] z-[230] shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 sm:px-6 h-[72px] border-b border-[#321327]/10 shrink-0">
          <div className="text-[11px] sm:text-[12px] font-bold tracking-[0.25em] text-[#321327] uppercase">
            Search IKNA
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-[#321327]/5 rounded-full transition-colors"
          >
            <X size={24} strokeWidth={1.5} className="text-[#321327]" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-6 sm:py-8 scrollbar-thin scrollbar-thumb-transparent">
          {/* SEARCH INPUT */}
          <form onSubmit={handleSearchSubmit} className="relative mb-10">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search bras..."
              className="w-full bg-transparent border-b-2 border-[#321327] py-4 pr-16 text-lg sm:text-xl font-light outline-none text-[#321327] placeholder:text-[#321327]/30 focus:border-[#840d5c] transition-colors"
            />

            {/* ACTION BUTTONS */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {query && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 text-[#321327]/40 hover:text-[#321327] transition-colors rounded-full hover:bg-[#321327]/5"
                  aria-label="Clear search"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              )}
              <button
                type="submit"
                className="p-1 text-[#321327] hover:text-[#840d5c] transition-colors"
              >
                <Search size={24} strokeWidth={1.5} />
              </button>
            </div>
          </form>

          {/* RESULTS / CATEGORIES PANEL */}
          <div className="space-y-6">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#321327]/50 uppercase">
              Browse Categories
            </p>

            <div className="flex flex-col gap-3">
              {braProducts.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(item.text);
                    updateSearchRoute(item.text);
                  }}
                  className="flex items-center justify-between p-4 bg-white border border-[#321327]/5 rounded-xl hover:border-[#840d5c]/30 hover:shadow-md transition-all text-left group"
                >
                  <div className="pr-3">
                    <span className="block text-[9px] font-bold uppercase text-[#840d5c] mb-1 tracking-wide">
                      {item.type}
                    </span>

                    <span className="text-sm sm:text-[15px] font-medium text-[#321327] group-hover:text-[#840d5c] transition-colors leading-snug">
                      {item.text}
                    </span>
                  </div>

                  <Tag
                    size={14}
                    className="shrink-0 text-[#321327]/20 group-hover:text-[#840d5c]/50 transition-colors"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchBar;