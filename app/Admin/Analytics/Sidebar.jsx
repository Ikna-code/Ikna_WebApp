'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BarChart3, Box, ClipboardList, Users, LogOut, ChevronDown, Menu, X, MessageSquareWarning } from 'lucide-react';
import { useStore } from '@/store/useStore';

const navItems = [
  { icon: BarChart3, label: 'Sales Analytics', link: '/Admin' },
  { icon: Box, label: 'Products', link: '/Admin/ProductDashboard' },
  { icon: ClipboardList, label: 'Orders', link: '/Admin/OrderDashboard' },
  { icon: Users, label: 'Customers', link: '/Admin/CustomersDashboard' },
  { icon: MessageSquareWarning, label: 'Reviews & Issues', link: '/Admin/Reviews' },
];

function SidebarContent({ onNavigate, pathname }) {
  const activeLink = useMemo(() => {
    const exactMatch = navItems.find((item) => item.link === pathname);
    if (exactMatch) return exactMatch.link;
    const nestedMatch = navItems.find((item) => item.link !== '/Admin' && pathname?.startsWith(item.link));
    return nestedMatch?.link || '/Admin';
  }, [pathname]);

  return (
    <>
      <div>
        <div className="mb-6 flex items-center gap-3 px-2 sm:mb-8">
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#f7e8f1] text-xl font-bold text-[#840d5c] shadow-sm">
            <Image src="/images/AI_images/logo1_ikna.png" alt="Ikna Logo" fill className="object-cover" sizes="36px" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#e7cfe0]">Admin Console</span>
          </div>
        </div>

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
        <button className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-[#e7cfe0] transition-colors hover:text-white">
          <LogOut className="h-5 w-5 opacity-70" />
          <span>Log Out</span>
        </button>

        <div className="relative overflow-hidden rounded-2xl border border-[#a33c82] bg-[#6d0b4b] p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
            👙
          </div>
          <p className="text-xs font-semibold leading-relaxed text-[#F3EBEF]">
            Empowering confidence,<br />every day.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#5a073f] p-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="h-9 w-9 shrink-0 rounded-full border border-white/20 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80')` }} />
            <div className="min-w-0 text-left">
              <p className="mb-0.5 truncate text-xs font-bold leading-none text-white">Admin User</p>
              <p className="truncate text-[10px] text-[#d8b8cc]">admin@ikna.com</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#d8b8cc]" />
        </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const mobileOpen = useStore((state) => state.isAdminMenuOpen);
  const setMobileOpen = useStore((state) => state.setAdminMenuOpen);
  const toggleMobileMenu = useStore((state) => state.toggleAdminMenu);

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

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-72 flex-col justify-between bg-[#4b0333] p-5 text-[#f7edf4] shadow-2xl transition-transform duration-300 sm:max-w-80 sm:p-6 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} `}>
        <SidebarContent onNavigate={() => setMobileOpen(false)} pathname={pathname} />
      </aside>
    </>
  );
}