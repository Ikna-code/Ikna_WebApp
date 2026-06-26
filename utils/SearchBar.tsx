"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
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
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("Search bras...");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const typingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placeholderTexts = [
    "Search bras...",
    "Try 'minimizer'...",
    "Try 'barely there'...",
    "Try 'everyday wear'...",
    "Try 'padded bra'...",
  ];

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

  // Typing animation effect for placeholder - runs continuously
  useEffect(() => {
    if (!isOpen || query.trim() !== "") {
      setCharIndex(0);
      setPlaceholderIndex(0);
      setDisplayedPlaceholder(placeholderTexts[0]);
      return;
    }

    const currentText = placeholderTexts[placeholderIndex];

    if (typingIntervalRef.current) {
      clearTimeout(typingIntervalRef.current);
    }

    if (charIndex < currentText.length) {
      // Type out character by character
      typingIntervalRef.current = setTimeout(() => {
        setDisplayedPlaceholder(currentText.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 80);
    } else {
      // Brief pause (500ms) then move to next placeholder immediately
      typingIntervalRef.current = setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length);
        setCharIndex(0);
        setDisplayedPlaceholder("");
      }, 500);
    }

    return () => {
      if (typingIntervalRef.current) {
        clearTimeout(typingIntervalRef.current);
      }
    };
  }, [isOpen, charIndex, placeholderIndex, query, placeholderTexts]);

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

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return braProducts.slice(0, 4);
    }

    return braProducts
      .filter((item) => {
        const searchableText = `${item.text} ${item.type}`.toLowerCase();
        return normalizedQuery
          .split(/\s+/)
          .filter(Boolean)
          .every((term) => searchableText.includes(term));
      })
      .slice(0, 6);
  }, [query]);

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
            <style>{`
              @keyframes typingCursor {
                0%, 49% { opacity: 1; }
                50%, 100% { opacity: 0; }
              }
              .typing-cursor::after {
                content: '';
                animation: typingCursor 1s infinite;
                margin-left: 2px;
                display: inline-block;
                width: 2px;
                height: 1.25rem;
                background-color: #840d5c;
              }
            `}</style>
            <div className="flex items-center border-b-2 border-[#321327] focus-within:border-[#840d5c] transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder={displayedPlaceholder}
                className={cn(
                  "flex-1 bg-transparent py-4 pr-4 text-lg sm:text-xl font-light outline-none text-[#321327]",
                  query.trim() === "" && charIndex < displayedPlaceholder.length
                    ? "placeholder:text-[#321327]/60"
                    : "placeholder:text-[#321327]/30"
                )}
              />
              {!query.trim() && charIndex === displayedPlaceholder.length && (
                <div className="typing-cursor mr-2" />
              )}
            </div>

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

          {isOpen && !!query.trim() && suggestions.length > 0 && (
            <div className="mb-8 rounded-2xl border border-[#321327]/8 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-[#321327]/50 uppercase">
                Suggestions
              </p>

              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button
                    key={`${item.type}-${item.text}`}
                    type="button"
                    onClick={() => {
                      setQuery(item.text);
                      updateSearchRoute(item.text);
                    }}
                    className="rounded-full border border-[#321327]/10 bg-[#faf6f8] px-3 py-2 text-left text-sm text-[#321327] transition hover:border-[#840d5c]/30 hover:text-[#840d5c]"
                  >
                    <span className="block text-[9px] font-bold uppercase tracking-wide text-[#840d5c]">
                      {item.type}
                    </span>
                    <span className="block leading-snug">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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