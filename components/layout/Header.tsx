'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import iknaLogo from '@/public/images/AI_images/logo1_ikna.png';
import UserProfile from '@/components/profile/UserProfile'; 
import { ShoppingBag, User, Search, X, Menu } from 'lucide-react';
import Navbar from './Navbar';
import { useStore } from "@/store/useStore";

const Header = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const announcementLines = [
    <span key="welcome">
      First time login? <span className="font-bold underline decoration-[#840d5c] underline-offset-4">Unlock ₹100 on your IKNA bra.</span>
    </span>,
    <span key="shipping">Shop above ₹349 to avail free delivery.</span>,
  ];

  const { cartItems } = useStore();
  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const buildShopUrl = (query: string) => {
    const trimmed = query.trim();
    const params = new URLSearchParams();

    if (trimmed) {
      params.set('search', trimmed);
    }

    const queryString = params.toString();
    return queryString ? `/shop?${queryString}` : '/shop';
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildShopUrl(searchQuery));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setSearchQuery(next);
    router.push(buildShopUrl(next));
  };

  const handleMobileSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsMobileMenuOpen(false);
    router.push(buildShopUrl(searchQuery));
  };

  useEffect(() => {
    const rotateInterval = setInterval(() => {
      setAnnouncementVisible(false);

      setTimeout(() => {
        setAnnouncementIndex((previous) => (previous + 1) % announcementLines.length);
        setAnnouncementVisible(true);
      }, 300);
    }, 2800);

    return () => {
      clearInterval(rotateInterval);
    };
  }, [announcementLines.length]);

  return (
    <>
      <header className="w-full bg-[#F9F3F5] border-b border-[#840d5c]/10 sticky top-0 z-50">
        <div className="w-full bg-[#321327] py-2.5 px-4 overflow-hidden">
          <div className="h-4 md:h-5 flex items-center justify-center">
            <div
              className={`text-center text-[10px] md:text-xs tracking-[0.2em] font-medium uppercase text-[#F9F3F5] transition-all duration-300 ${announcementVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
            >
              {announcementLines[announcementIndex]}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* LOGO */}
          <div className="flex-shrink-0">
            <Link href="/" className="block">
              <div className="relative w-12 h-12 md:w-16 md:h-16 mix-blend-multiply transition-transform hover:scale-105">
                <Image src={iknaLogo} alt="IKNA Logo" fill priority sizes="160px" className="object-contain" />
              </div>
            </Link>
          </div>

          {/* DESKTOP NAV */}
          <Navbar />
          
          {/* ACTIONS & MOBILE TRIGGER */}
          <div className="flex items-center space-x-5 md:space-x-7 text-[#321327]">
            <div className="hidden md:block relative w-10 h-10 shrink-0">
              <form
                onSubmit={handleSearchSubmit}
                className="absolute right-0 top-0 h-10 w-10 hover:w-72 focus-within:w-72 overflow-hidden rounded-full border border-[#321327]/20 bg-white transition-all duration-300"
                role="search"
                aria-label="Search products"
              >
                <Search size={18} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#321327] pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search products"
                  className="h-full w-full bg-transparent pl-10 pr-4 text-sm text-[#321327] placeholder:text-[#321327]/40 outline-none"
                />
              </form>
            </div>
            <button className="hidden md:block" aria-label="Account" onClick={() => setIsProfileOpen(true)}>
              <User size={20} strokeWidth={1.5} />
            </button>
            <Link href="/cart" className="hidden md:block relative group" aria-label="Cart">
              <ShoppingBag size={20} strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-[#840d5c] text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* HAMBURGER ICON (MOBILE ONLY) */}
            <button className="md:hidden p-1" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
          isMobileMenuOpen ? 'bg-[#321327]/40 backdrop-blur-sm opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div 
          className={`fixed top-0 right-0 w-[80%] max-w-sm h-full bg-[#F9F3F5] shadow-2xl transition-transform duration-300 ease-in-out transform ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-5 border-b border-[#840d5c]/10">
            <span className="text-sm font-bold tracking-widest text-[#321327] uppercase">Menu</span>
            <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} strokeWidth={1.5} /></button>
          </div>

          <div className="p-8 flex flex-col h-full">
            {/* NAV LINKS (HOME, ADMIN, SHOP, ABOUT) */}
            <Navbar isMobile onClose={() => setIsMobileMenuOpen(false)} />

            {/* ACTION LINKS (SEARCH, PROFILE, CART) */}
            <div className="mt-8 pt-8 border-t border-[#840d5c]/10 flex flex-col space-y-6">
              <form onSubmit={handleMobileSearchSubmit} className="space-y-2">
                <label className="text-[10px] font-bold tracking-[0.2em] text-[#321327] uppercase block">
                  Search
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#321327]/60" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products"
                    className="w-full h-11 rounded-full border border-[#321327]/20 bg-white pl-10 pr-11 text-sm text-[#321327] placeholder:text-[#321327]/40 outline-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#321327] text-white flex items-center justify-center"
                    aria-label="Search products"
                  >
                    <Search size={15} />
                  </button>
                </div>
              </form>
              
              <button 
                onClick={() => { setIsMobileMenuOpen(false); setIsProfileOpen(true); }}
                className="flex items-center space-x-4 text-[11px] font-bold tracking-[0.2em] text-[#321327]"
              >
                <User size={20} /> <span>PROFILE</span>
              </button>

              <Link 
                href="/cart" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-4 text-[11px] font-bold tracking-[0.2em] text-[#321327]"
              >
                <div className="relative">
                  <ShoppingBag size={20} />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#840d5c] text-white text-[8px] rounded-full h-4 w-4 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span>CART</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* PROFILE DRAWER */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 z-[110] flex justify-end pointer-events-auto transition-colors duration-300 bg-[#321327]/40 backdrop-blur-sm"
          onClick={() => setIsProfileOpen(false)}
        >
          <div
            className="w-full bg-[#F9F3F5] h-full shadow-2xl flex flex-col transition-transform duration-300 transform pointer-events-auto translate-x-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-[#840d5c]/10">
              <span className="text-xs font-bold tracking-[0.2em] text-[#321327] uppercase">Account Profile</span>
              <button onClick={() => setIsProfileOpen(false)} className="p-2"><X size={20} /></button>
            </div>
            <UserProfile />
          </div>
        </div>
      )}
    </>
  );
};

export default Header;