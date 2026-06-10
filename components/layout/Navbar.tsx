"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface NavbarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Navbar({ isMobile, onClose }: NavbarProps) {
  const pathname = usePathname();
  const user = useStore((state) => state.user);
  const products = useStore((state) => state.products);
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const [isShopDrawerOpen, setIsShopDrawerOpen] = useState(false);
  const [apiFallbackCategories, setApiFallbackCategories] = useState<string[]>([]);

  const shopCategories = useMemo(() => {
    const categories = products
      .map(
        (product: any) =>
          product?.category?.name || product?.category || product?.category_name
      )
      .filter((value: unknown) => typeof value === "string" && value.trim().length > 0)
      .map((value: string) => value.trim());

    const unique = Array.from(new Set(categories));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [products]);

  useEffect(() => {
    setIsShopMenuOpen(false);
    setIsShopDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (shopCategories.length > 0) {
      setApiFallbackCategories([]);
      return;
    }

    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/admin/products', { cache: 'no-store' });
        if (!response.ok) return;

        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : [];
        const categories = Array.from(
          new Set(
            rows
              .map((product: any) => String(product?.category || '').trim())
              .filter((category: string) => category.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));

        if (isMounted) {
          setApiFallbackCategories(categories);
        }
      } catch {
        if (isMounted) {
          setApiFallbackCategories([]);
        }
      }
    };

    void fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [shopCategories.length]);

  const effectiveShopCategories = shopCategories.length > 0 ? shopCategories : apiFallbackCategories;

  const handleCloseAll = () => {
    setIsShopMenuOpen(false);
    setIsShopDrawerOpen(false);
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
      ? "relative flex flex-col space-y-6 overflow-hidden" 
      : "hidden md:flex items-center space-x-10"}
    >
      {visibleLinks.map((link) => {
        const isShopLink = link.href === "/shop";
        const isActive = pathname === link.href;

        if (isShopLink) {
          if (isMobile) {
            return (
              <div key={link.href} className="relative">
                <button
                  type="button"
                  onClick={() => setIsShopDrawerOpen(true)}
                  className={`w-full text-[11px] font-bold tracking-[0.2em] transition-all duration-200 flex items-center justify-between
                    ${isActive
                      ? "text-[#840d5c]"
                      : "text-[#321327] hover:text-[#840d5c]"
                    }`}
                >
                  <span>SHOP</span>
                  <ChevronRight size={16} className="shrink-0" />
                </button>

                <div
                  className={`absolute inset-0 z-20 bg-[#F9F3F5] transition-transform duration-300 ease-in-out ${
                    isShopDrawerOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#840d5c]/10 pb-4">
                    <button
                      type="button"
                      onClick={() => setIsShopDrawerOpen(false)}
                      className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-[#321327] uppercase"
                    >
                      <ChevronLeft size={16} />
                      Back
                    </button>
                    <span className="text-[10px] font-bold tracking-[0.18em] text-[#321327] uppercase">Shop</span>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {effectiveShopCategories.map((category) => (
                      <Link
                        key={category}
                        href={`/shop?category=${encodeURIComponent(category)}`}
                        onClick={handleCloseAll}
                        className="text-[10px] font-bold tracking-[0.18em] text-[#321327] hover:text-[#840d5c] uppercase px-2 py-2 rounded-lg hover:bg-[#f2e4ea]"
                      >
                        {category}
                      </Link>
                    ))}

                    {!effectiveShopCategories.length && (
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-[#321327]/50 uppercase px-2 py-2">
                        No categories yet
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

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
                <div
                  className={isMobile
                    ? "mt-3 ml-3 pl-3 border-l border-[#840d5c]/20 flex flex-col gap-3"
                    : "absolute top-full left-0 mt-3 min-w-[220px] bg-white border border-[#840d5c]/15 rounded-xl shadow-xl p-3 z-[120] flex flex-col gap-1"
                  }
                >
                  {effectiveShopCategories.map((category) => (
                    <Link
                      key={category}
                      href={`/shop?category=${encodeURIComponent(category)}`}
                      onClick={handleCloseAll}
                      className="text-[10px] font-bold tracking-[0.18em] text-[#321327] hover:text-[#840d5c] uppercase px-2 py-1.5 rounded-lg hover:bg-[#f9f3f5]"
                    >
                      {category}
                    </Link>
                  ))}

                  {!effectiveShopCategories.length && (
                    <span className="text-[10px] font-semibold tracking-[0.12em] text-[#321327]/50 uppercase px-2 py-1.5">
                      No categories yet
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