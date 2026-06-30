'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Box, ClipboardList, Users, LogOut, ChevronDown, Menu, X, MessageSquareWarning } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useStore } from '@/store/useStore';

const navItems = [
  { icon: BarChart3, label: 'Sales Analytics', link: '/Admin' },
  { icon: Box, label: 'Products', link: '/Admin/ProductDashboard' },
  { icon: ClipboardList, label: 'Orders', link: '/Admin/OrderDashboard' },
  { icon: Users, label: 'Customers', link: '/Admin/CustomersDashboard' },
  { icon: MessageSquareWarning, label: 'Reviews & Issues', link: '/Admin/Reviews' },
];

function SidebarContent({ adminUser, isSigningOut, onLogout, onNavigate, pathname }) {
  const activeLink = useMemo(() => {
    const exactMatch = navItems.find((item) => item.link === pathname);
    if (exactMatch) return exactMatch.link;
    const nestedMatch = navItems.find((item) => item.link !== '/Admin' && pathname?.startsWith(item.link));
    return nestedMatch?.link || '/Admin';
  }, [pathname]);

  const displayName = [adminUser?.firstName, adminUser?.lastName].filter(Boolean).join(' ').trim() || 'Admin User';
  const displayEmail = adminUser?.email || 'admin@iknaonline.com';

  return (
    <>
      <div>
        <Link href="/" onClick={onNavigate} className="mb-6 flex items-center gap-3 px-2 sm:mb-8">
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#f7e8f1] text-xl font-bold text-[#840d5c] shadow-sm">
            <Image src="/images/AI_images/logo1_ikna.png" alt="Ikna Logo" fill className="object-cover" sizes="36px" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#e7cfe0]">Admin Console</span>
          </div>
        </Link>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeLink === item.link;

            return (
              <Link
                key={item.link}
                href={item.link}
                onClick={onNavigate}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#840d5c] text-white shadow-inner'
                    : 'text-[#e7cfe0] hover:bg-[#840d5c]/35 hover:text-white'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'opacity-90' : 'opacity-70'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-5">
        <button
          type="button"
          onClick={onLogout}
          disabled={isSigningOut}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-[#e7cfe0] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-5 w-5 opacity-70" />
          <span>{isSigningOut ? 'Signing Out...' : 'Log Out'}</span>
        </button>

        <div className="relative overflow-hidden rounded-2xl border border-[#a33c82] bg-[#6d0b4b] p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
            👙
          </div>
          <p className="text-xs font-semibold leading-relaxed text-[#F3EBEF]">
            Empowering confidence,<br />every day.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#5a073f] p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full border border-white/20 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80')` }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight text-white">{displayName}</p>
              <p className="text-xs text-[#d8b8cc]">{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Sidebar({ adminUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = supabaseBrowser;
  const mobileOpen = useStore((state) => state.isAdminMenuOpen);
  const setMobileOpen = useStore((state) => state.setAdminMenuOpen);
  const toggleMobileMenu = useStore((state) => state.toggleAdminMenu);
  const resetStoreState = useStore;
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      resetStoreState.setState({
        user: null,
        isAuthInitialized: false,
        cartItems: [],
        isCartInitialized: false,
        cartUserId: null,
        orders: [],
        isOrdersInitialized: false,
        wishlist: [],
        isWishlistInitialized: false,
        addresses: [],
        isAddressesInitialized: false,
        isAdminMenuOpen: false,
      });

      toast.success('Signed out successfully');
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error(error?.message || 'Failed to sign out');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-[#e8bfd5] bg-[#f8eef4]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-400 items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#8a5f79]">Admin Console</p>
            <p className="text-lg font-bold text-[#2f1126]">IKNA Dashboard</p>
          </div>
          <button
            type="button"
            onClick={toggleMobileMenu}
            aria-label={mobileOpen ? 'Close admin menu' : 'Open admin menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e8bfd5] bg-white text-[#840d5c] shadow-sm"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close admin navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#4f0838]/45 lg:hidden"
        />
      )}

      <aside className={`fixed inset-x-0 inset-y-0 left-0 z-50 flex w-screen max-w-screen flex-col justify-between bg-[#4b0333] p-5 text-[#f7edf4] shadow-2xl transition-transform duration-300 sm:max-w-80 sm:p-6 lg:w-64 lg:max-w-none lg:sticky lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-none overflow-y-auto lg:overflow-hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} `}>
        <div className="flex items-center justify-between lg:hidden mb-6">
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#e7cfe0]">Admin Menu</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#e7cfe0] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent adminUser={adminUser} isSigningOut={isSigningOut} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} pathname={pathname} />
      </aside>
    </>
  );
}