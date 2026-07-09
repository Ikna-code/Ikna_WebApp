"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { ChevronDown } from "lucide-react";

interface NavbarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

interface FilterOption {
  id: string;
  value: string;
  displayLabel: string;
}

interface CategoryMeta {
  name: string;
  primaryFilterOptions: FilterOption[]; // first filter group options (e.g. Comfort Type)
  primaryFilterGroupSlug: string;      // e.g. 'comfort-type'
}

export default function Navbar({ isMobile, onClose }: NavbarProps) {
  const pathname = usePathname();
  const user = useStore((state) => state.user);
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const [isShopDrawerOpen, setIsShopDrawerOpen] = useState(false);
  const [categoryMeta, setCategoryMeta] = useState<CategoryMeta[]>([]);

  useEffect(() => {
    setIsShopMenuOpen(false);
    setIsShopDrawerOpen(false);
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
              .map((item: any) => {
                const filterGroups = Array.isArray(item.filterGroups) ? item.filterGroups : [];
                // Use first filter group (e.g. Comfort Type for Bras) as the submenu
                const firstGroup = filterGroups[0] ?? null;
                return {
                  name: String(item.name || ''),
                  primaryFilterOptions: firstGroup?.filterOptions ?? [],
                  primaryFilterGroupSlug: firstGroup?.slug ?? '',
                };
              })
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
    onClose?.();
  };

  const buildShopHref = (categoryName: string, filterOptionValue?: string) => {
    const basePath = `/shop/${encodeURIComponent(categoryName)}`;
    const normalized = (filterOptionValue || '').trim();

    if (!normalized) {
      return basePath;
    }

    const params = new URLSearchParams();
    params.set('search', normalized);
    return `${basePath}?${params.toString()}`;
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
                        <span className="text-[10px] font-bold tracking-[0.18em] text-[#321327] uppercase px-2 py-2">
                          {cat.name}
                        </span>

                        {cat.primaryFilterOptions.length > 0 && (
                          <div className="ml-4 mt-1 mb-1 flex flex-col gap-0.5 pl-3">
                            {cat.primaryFilterOptions.map((opt) => (
                              <Link
                                key={opt.id}
                                href={buildShopHref(cat.name, opt.displayLabel)}
                                onClick={handleCloseAll}
                                className="text-[9px] font-semibold tracking-[0.14em] text-[#321327]/70 hover:text-[#840d5c] uppercase px-2 py-1.5 rounded hover:bg-[#f2e4ea]"
                              >
                                {opt.displayLabel}
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
                     <div key={cat.name} className="flex flex-col">
                       <span className="text-[10px] font-bold tracking-[0.18em] text-[#321327] uppercase px-2 py-1.5">
                         {cat.name}
                       </span>

                       {cat.primaryFilterOptions.length > 0 && (
                         <div className="ml-3 mb-1 flex flex-col gap-0.5 pl-3">
                           {cat.primaryFilterOptions.map((opt) => (
                             <Link
                               key={opt.id}
                               href={buildShopHref(cat.name, opt.displayLabel)}
                               onClick={handleCloseAll}
                               className="text-[9px] font-semibold tracking-[0.14em] text-[#321327]/70 hover:text-[#840d5c] uppercase px-2 py-1.5 rounded hover:bg-[#f9f3f5]"
                             >
                               {opt.displayLabel}
                             </Link>
                           ))}
                         </div>
                       )}
                     </div>
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