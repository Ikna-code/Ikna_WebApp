"use client";
import React, { useState } from 'react';

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

const VariantSwitcher = () => {
  const [selectedSize, setSelectedSize] = useState("M");

  return (
    /* Outer Container with the new soft background */
    <div className="p-8 bg-[#faf3f5] rounded-3xl space-y-6 max-w-md mx-auto">
      
      {/* SIZE SELECTION SECTION */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-[10px] tracking-[0.2em] font-bold uppercase text-[#522d42]">
            Select Size
          </label>
          <button className="text-[10px] font-bold underline text-[#840d5c] uppercase tracking-wider hover:opacity-80">
            Size Guide
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`
                w-12 h-12 rounded-full border flex items-center justify-center text-xs font-bold transition-all duration-200
                ${selectedSize === size 
                  ? "border-[#840d5c] bg-[#840d5c] text-white shadow-lg scale-110" 
                  : "border-[#d8c1c7] bg-white text-[#321327] hover:border-[#840d5c]"}
              `}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* CONFIDENCE PREVIEW TOGGLE */}
      {/* Background here is a slightly darker version of the cream to create depth */}
      <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[#d8c1c7]/40 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-grow">
            <h4 className="text-[10px] tracking-widest font-bold uppercase text-[#321327]">
              Confidence Preview
            </h4>
            <p className="text-[11px] text-[#522d42] mt-1 leading-relaxed">
              Currently viewing this product on a model wearing size <span className="text-[#840d5c] font-bold">{selectedSize}</span>. 
            </p>
          </div>
          {/* Using your metallic-gold-button class or a complementary color */}
          <button 
            className="px-4 py-2 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all rounded-md"
          >
            Switch
          </button>
        </div>
      </div>

      {/* ADD TO CART ACTION */}
      <div className="pt-4">
        {/* Main Action Button in your Brand Plum */}
        <button className="w-full py-4 bg-[#840d5c] text-white font-bold text-xs tracking-[0.3em] uppercase hover:shadow-[0_10px_20px_rgba(132,13,92,0.2)] transition-all flex items-center justify-center gap-2 rounded-xl">
          Add to Bag — $68.00
        </button>
        <p className="text-center text-[10px] text-[#522d42]/70 mt-3 italic">
          Free shipping on orders over $100.
        </p>
      </div>
    </div>
  );
};

export default VariantSwitcher;