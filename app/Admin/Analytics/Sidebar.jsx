'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Box, ClipboardList, Users, Megaphone, LogOut, ChevronDown, Menu, X } from 'lucide-react';

const navItems = [
  { icon: BarChart3, label: 'Sales Analytics', link: '/Admin' },
  { icon: Box, label: 'Products', link: '/Admin/ProductDashboard' },
  { icon: ClipboardList, label: 'Orders', link: '/Admin/OrderDashboard' },
  { icon: Users, label: 'Customers', link: '/Admin/CustomersDashboard' },
  { icon: Megaphone, label: 'Marketing', link: '/Admin/MarketingDashboard' },
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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF6F8] text-xl font-bold text-[#3D0A21] shadow-sm">
            i
          </div>
          <div>
            <span className="block text-2xl font-bold tracking-tight text-white">ikna</span>
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#CBB2BE]">Admin Console</span>
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
                    ? 'bg-[#5C0632] text-white shadow-inner'
                    : 'text-[#CBB2BE] hover:bg-[#5C0632]/30 hover:text-white'
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
        <button className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-[#CBB2BE] transition-colors hover:text-white">
          <LogOut className="h-5 w-5 opacity-70" />
          <span>Log Out</span>
        </button>

        <div className="relative overflow-hidden rounded-2xl border border-[#6B1F43] bg-[#521330] p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
            👙
          </div>
          <p className="text-xs font-semibold leading-relaxed text-[#F3EBEF]">
            Empowering confidence,<br />every day.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#2B0516] p-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="h-9 w-9 shrink-0 rounded-full border border-white/20 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80')` }} />
            <div className="min-w-0 text-left">
              <p className="mb-0.5 truncate text-xs font-bold leading-none text-white">Admin User</p>
              <p className="truncate text-[10px] text-[#A68897]">admin@ikna.com</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#A68897]" />
        </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-[#E9E4E0] bg-[#F7F4F0]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-400 items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#7A6B73]">Admin Console</p>
            <p className="text-lg font-bold text-[#2B1B24]">IKNA Dashboard</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? 'Close admin menu' : 'Open admin menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E9E4E0] bg-white text-[#3D0A21] shadow-sm"
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
          className="fixed inset-0 z-40 bg-[#2B0516]/45 lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-72 flex-col justify-between bg-[#3D0A21] p-5 text-[#F3EBEF] shadow-2xl transition-transform duration-300 sm:max-w-80 sm:p-6 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} `}>
        <SidebarContent onNavigate={() => setMobileOpen(false)} pathname={pathname} />
      </aside>
    </>
  );
}