"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { ChevronDown, ChevronRight } from "lucide-react";

interface NavbarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

interface CategoryMeta {
  name: string;
  subCategories: { id: string; name: string; slug: string }[];
}

export default function Navbar({ isMobile, onClose }: NavbarProps) {
  const pathname = usePathname();
  const user = useStore((state) => state.user);
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const [isShopDrawerOpen, setIsShopDrawerOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryMeta, setCategoryMeta] = useState<CategoryMeta[]>([]);

  useEffect(() => {
    setIsShopMenuOpen(false);
    setIsShopDrawerOpen(false);
    setExpandedCategory(null);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const [filtersRes, productsRes] = await Promise.all([
          fetch('/api/filters', { cache: 'no-store' }),
          fetch('/api/products', { cache: 'no-store' }),
        ]);
        if (!filtersRes.ok) return;
        const filtersData = await filtersRes.json();
        const productsData = productsRes.ok ? await productsRes.json() : [];

        // Build set of category names that actually have products
        const activeCategories = new Set<string>(
          (Array.isArray(productsData) ? productsData : [])
            .map((p: any) => String(p?.productType?.name || p?.category || '').trim())
            .filter(Boolean)
        );

        if (isMounted && Array.isArray(filtersData)) {
          setCategoryMeta(
            filtersData
              .filter((item: any) => activeCategories.has(String(item.name || '').trim()))
              .map((item: any) => ({
                name: String(item.name || ''),
                subCategories: Array.isArray(item.subCategories) ? item.subCategories : [],
              }))
          );
        }
      } catch {
        if (isMounted) setCategoryMeta([]);
      }
    };
    void fetchCategories();
    return () => { isMounted = false; };
  }, []);

  const handleCloseAll = () => {
    setIsShopMenuOpen(false);
    setIsShopDrawerOpen(false);
    setExpandedCategory(null);
    onClose?.();
  };

  const navLinks = [
    { name: "HOME", href: "/" },
    { name: "SHOP", href: "/shop" },
    { name: "ABOUT IKNA", href: "/about-us" },
  ];

  const visibleLinks = user?.role === "ADMIN"
    ? [{ name: "ADMIN DASHBOARD", href: "/Admin" }, ...navLinks]
    : navLinks;

  return (
    <nav className={isMobile
      ? "flex flex-col space-y-6"
      : "hidden md:flex items-center space-x-10"}
    >
      {visibleLinks.map((link) => {
        const isShopLink = link.href === "/shop";
        const isActive = pathname === link.href;

        if (isShopLink) {
          if (isMobile) {
            return (
              <div key={link.href} className="flex flex-col">
                {/* SHOP header row */}
                <button
                  type="button"
                  onClick={() => setIsShopDrawerOpen((prev) => !prev)}
                  className={`w-full text-[11px] font-bold tracking-[0.2em] transition-all duration-200 flex items-center justify-between
                    ${isActive ? "text-[#840d5c]" : "text-[#321327] hover:text-[#840d5c]"}`}
                >
                  <span>SHOP</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 shrink-0 ${isShopDrawerOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Animated category list */}
                {isShopDrawerOpen && (
                  <div className="mt-4 flex flex-col gap-1 pl-1">


                    {categoryMeta.length === 0 && (
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-[#321327]/40 uppercase px-2 py-2">
                        Loading…
                      </span>
                    )}

                    {categoryMeta.map((cat) => (
                      <div key={cat.name} className="flex flex-col">
                        {/* Category row — tap to expand subcategories */}
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/shop?category=${encodeURIComponent(cat.name)}`}
                            onClick={handleCloseAll}
                            className="flex-1 text-[10px] font-bold tracking-[0.18em] text-[#321327] hover:text-[#840d5c] uppercase px-2 py-2 rounded-lg hover:bg-[#f2e4ea]"
                          >
                            {cat.name}
                          </Link>
                          {cat.subCategories.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedCategory((prev) => prev === cat.name ? null : cat.name)}
                              className="p-2 text-[#321327]/50 hover:text-[#840d5c] shrink-0"
                              aria-label={`Expand ${cat.name}`}
                            >
                              <ChevronRight
                                size={14}
                                className={`transition-transform duration-200 ${expandedCategory === cat.name ? "rotate-90" : ""}`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Subcategory list */}
                        {expandedCategory === cat.name && cat.subCategories.length > 0 && (
                          <div className="ml-4 mt-1 mb-1 flex flex-col gap-0.5 pl-3 border-l border-[#840d5c]/20">
                            {cat.subCategories.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`/shop?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.slug)}`}
                                onClick={handleCloseAll}
                                className="text-[9px] font-semibold tracking-[0.14em] text-[#321327]/70 hover:text-[#840d5c] uppercase px-2 py-1.5 rounded hover:bg-[#f2e4ea]"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Desktop dropdown
          return (
            <div key={link.href} className="relative">
              <button
                type="button"
                onClick={() => setIsShopMenuOpen((previous) => !previous)}
                className={`text-[11px] font-bold tracking-[0.2em] transition-all duration-200 flex items-center gap-1.5
                  ${isActive
                    ? "text-[#840d5c] border-b-2 border-[#840d5c] md:pb-1 w-fit"
                    : "text-[#321327] hover:text-[#840d5c]"
                  }`}
              >
                SHOP
                <ChevronDown
                  size={14}
                  className={`transition-transform ${isShopMenuOpen ? "rotate-180" : "rotate-0"}`}
                />
              </button>

              {isShopMenuOpen && (
                <div className="absolute top-full left-0 mt-3 min-w-[220px] bg-white border border-[#840d5c]/15 rounded-xl shadow-xl p-3 z-[120] flex flex-col gap-1">

                  {categoryMeta.map((cat) => (
                    <Link
                      key={cat.name}
                      href={`/shop?category=${encodeURIComponent(cat.name)}`}
                      onClick={handleCloseAll}
                      className="text-[10px] font-bold tracking-[0.18em] text-[#321327] hover:text-[#840d5c] uppercase px-2 py-1.5 rounded-lg hover:bg-[#f9f3f5]"
                    >
                      {cat.name}
                    </Link>
                  ))}
                  {categoryMeta.length === 0 && (
                    <span className="text-[10px] font-semibold tracking-[0.12em] text-[#321327]/40 uppercase px-2 py-1.5">
                      Loading…
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={handleCloseAll}
            className={`text-[11px] font-bold tracking-[0.2em] transition-all duration-200 
              ${isActive 
                ? "text-[#840d5c] border-b-2 border-[#840d5c] md:pb-1 w-fit" 
                : "text-[#321327] hover:text-[#840d5c]"
              }`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}