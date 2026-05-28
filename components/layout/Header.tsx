'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SearchBar from '@/utils/SearchBar';
import UserProfile from '@/components/profile/UserProfile'; 
import { ShoppingBag, User, Search, X, Menu } from 'lucide-react';
import Navbar from './Navbar';
import { useStore } from "@/store/useStore";

const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { cartItems } = useStore();
  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

  return (
    <>
      <header className="w-full bg-[#F9F3F5] border-b border-[#840d5c]/10 sticky top-0 z-50">
        <div className="w-full bg-[#321327] py-2.5 px-4 text-center">
          <p className="text-[10px] md:text-xs tracking-[0.2em] font-medium uppercase text-[#F9F3F5]">
            First time login? <span className="font-bold underline cursor-pointer hover:text-[#840d5c] transition-colors decoration-[#840d5c] underline-offset-4">Unlock ₹100 off your IKNA bra.</span>
          </p>
        </div>

        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* LOGO */}
          <div className="flex-shrink-0">
            <Link href="/" className="block">
              <div className="relative w-12 h-12 md:w-16 md:h-16 mix-blend-multiply transition-transform hover:scale-105">
                <Image src="/images/AI_images/logo1_ikna.png" alt="IKNA Logo" fill priority className="object-contain" />
              </div>
            </Link>
          </div>

          {/* DESKTOP NAV */}
          <Navbar />
          
          {/* ACTIONS & MOBILE TRIGGER */}
          <div className="flex items-center space-x-5 md:space-x-7 text-[#321327]">
            <button className="hidden md:block" aria-label="Search" onClick={() => setIsSearchOpen(true)}>
              <Search size={20} strokeWidth={1.5} />
            </button>
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
              <button 
                onClick={() => { setIsMobileMenuOpen(false); setIsSearchOpen(true); }}
                className="flex items-center space-x-4 text-[11px] font-bold tracking-[0.2em] text-[#321327]"
              >
                <Search size={20} /> <span>SEARCH</span>
              </button>
              
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

      <SearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* PROFILE DRAWER */}
      <div 
        className={`fixed inset-0 z-[110] flex justify-end pointer-events-none transition-colors duration-300 ${
          isProfileOpen ? 'pointer-events-auto bg-[#321327]/40 backdrop-blur-sm' : 'bg-transparent'
        }`}
        onClick={() => setIsProfileOpen(false)}
      >
        <div 
          className={`w-full  bg-[#F9F3F5] h-full shadow-2xl flex flex-col transition-transform duration-300 transform pointer-events-auto ${
            isProfileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b border-[#840d5c]/10">
            <span className="text-xs font-bold tracking-[0.2em] text-[#321327] uppercase">Account Profile</span>
            <button onClick={() => setIsProfileOpen(false)} className="p-2"><X size={20} /></button>
          </div>
          <UserProfile/>
        </div>
      </div>
    </>
  );
};

export default Header;