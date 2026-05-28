import React from 'react';
import { BarChart3, Box, FileText, Users, Megaphone, Settings, LogOut, ChevronDown } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { icon: BarChart3, label: 'Sales Analytics', active: true ,link: '/Admin'},
    { icon: Box, label: 'Box', link: '/Admin/ProductDashboard' },
    { icon: FileText, label: 'FileText', link: '/Admin/FileText' },
    { icon: Users, label: 'Users', link: '/Admin/CustomersDashboard' },
    { icon: Megaphone, label: 'Megaphone', link: '/Admin/MarketingDashboard' },
    { icon: Settings, label: 'Settings', link: '/Admin/Settings' },
  ];

  return (
    <aside className="w-64 bg-[#3D0A21] text-[#F3EBEF] flex flex-col justify-between p-6 shrink-0 hidden md:flex">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="bg-[#FAF6F8] text-[#3D0A21] w-9 h-9 rounded-full flex items-center justify-center font-bold text-xl shadow-sm">
            i
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">ikna</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item, idx) => (
            
            <button
              key={idx}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                item.active 
                  ? 'bg-[#5C0632] text-white shadow-inner' 
                  : 'text-[#CBB2BE] hover:text-white hover:bg-[#5C0632]/30'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'opacity-90' : 'opacity-70'}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-5">
        <button className="w-full flex items-center gap-3 px-4 py-2 text-[#CBB2BE] hover:text-white text-sm font-medium transition-colors">
          <LogOut className="w-5 h-5 opacity-70" />
          <span>Log Out</span>
        </button>

        {/* Promo Mini Banner */}
        <div className="bg-[#521330] rounded-2xl p-4 relative overflow-hidden border border-[#6B1F43]">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3 text-xl">
            👙
          </div>
          <p className="text-xs font-semibold leading-relaxed text-[#F3EBEF]">
            Empowering confidence,<br />every day.
          </p>
        </div>

        {/* Profile Footer */}
        <div className="flex items-center justify-between p-2.5 bg-[#2B0516] rounded-xl border border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-cover bg-center border border-white/20 shrink-0" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80')` }} />
            <div className="text-left min-w-0">
              <p className="text-xs font-bold text-white leading-none mb-0.5 truncate">Admin User</p>
              <p className="text-[10px] text-[#A68897] truncate">admin@clovia.com</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-[#A68897] shrink-0" />
        </div>
      </div>
    </aside>
  );
}