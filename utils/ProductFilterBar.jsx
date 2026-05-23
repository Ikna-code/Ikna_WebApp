import React, { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

export const ProductFilterBar = ({ products }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Sticky Navigation Bar */}
      <div className="sticky top-0 z-40 bg-[#F9F3F5]/90 backdrop-blur-md border-y border-[#840d5c]/10 mb-8 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <button 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#321327] hover:text-[#840d5c] transition-colors"
          >
            <Filter size={14} /> Filter & Sort
          </button>
          
          <div className="hidden md:flex gap-8">
            {['All', 'Bras', 'Panties', 'Sets'].map((cat) => (
              <button key={cat} className="text-[10px] font-bold uppercase tracking-widest text-[#321327] hover:text-[#840d5c] relative group">
                {cat}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#840d5c] transition-all group-hover:w-full"></span>
              </button>
            ))}
          </div>

          <p className="text-[10px] font-bold text-[#840d5c]/60 uppercase tracking-widest">
            {products.length} Items
          </p>
        </div>
      </div>

      {/* --- Filter Side Drawer --- */}
      <div className={`fixed inset-0 z-50 transition-visibility ${isOpen ? 'visible' : 'invisible'}`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-[#321327]/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsOpen(false)}
        />

        {/* Drawer Panel */}
        <div className={`absolute right-0 top-0 h-full w-full max-w-xs md:max-w-sm bg-[#F9F3F5] shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#840d5c]/10">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#321327]">Filter & Sort</h2>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:rotate-90 transition-transform">
              <X size={20} className="text-[#321327]" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-6 overflow-y-auto h-[calc(100vh-140px)] space-y-8">
            {/* Sort Section */}
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#840d5c] mb-4">Sort By</h3>
              <select className="w-full bg-transparent border-b border-[#840d5c]/20 py-2 text-xs text-[#321327] focus:outline-none">
                <option>Newest Arrivals</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
            </select>
            </section>

            {/* Size Filter */}
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#840d5c] mb-4">Size</h3>
              <div className="grid grid-cols-4 gap-2">
                {['XS', 'S', 'M', 'L', 'XL'].map(size => (
                  <button key={size} className="border border-[#840d5c]/10 py-2 text-[10px] text-[#321327] hover:bg-[#840d5c] hover:text-white transition-colors">
                    {size}
                  </button>
                ))}
              </div>
            </section>

            {/* Color Filter */}
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#840d5c] mb-4">Color</h3>
              <div className="flex flex-wrap gap-3">
                {['#321327', '#840d5c', '#F9F3F5', '#E5B7C4'].map(color => (
                  <button 
                    key={color} 
                    className="w-6 h-6 rounded-full border border-black/10" 
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Drawer Footer (Actions) */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#F9F3F5] border-t border-[#840d5c]/10 grid grid-cols-2 gap-4">
            <button className="text-[10px] font-bold uppercase tracking-widest py-4 border border-[#840d5c] text-[#840d5c]  hover:text-white hover:bg-[#840d5c] transition-colors">
              Clear All
            </button>
            <button className="text-[10px] font-bold uppercase tracking-widest py-4 bg-[#321327] text-white">
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  );
};