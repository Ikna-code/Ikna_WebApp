import React from 'react';
import { Calendar, Download, ChevronDown } from 'lucide-react';

export default function Header() {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2B1B24]">Sales Analytics</h1>
        <p className="text-xs text-[#7A6B73] mt-0.5">Track your business performance and sales insights</p>
      </div>
      <div className="flex items-center gap-3 self-end sm:self-center">
        <div className="bg-white px-3 py-2 rounded-xl flex items-center gap-2 border border-[#E9E4E0] shadow-sm text-xs font-medium text-[#4A3C44] cursor-pointer">
          <Calendar className="w-4 h-4 text-[#7A6B73]" />
          <span>May 4 – May 10, 2026</span>
          <ChevronDown className="w-4 h-4 text-[#A1959C]" />
        </div>
        <button className="bg-[#3D0A21] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-medium hover:bg-[#521330] transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>
    </header>
  );
}