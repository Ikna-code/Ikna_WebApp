       'use client';
       import React from 'react';
       const product = {
         id: 1,
         name: 'THE EVERYDAY SEAMLESS',
            tag: 'Best Seller',
       };
       {product.tag && (
          <div className="absolute top-0 left-0 z-20">
            <div className="metallic-gold-tag px-3 py-1 shadow-md rounded-br-lg text-[10px] font-bold text-[#2d051a] uppercase tracking-wider">
              {product.tag}
            </div>
            <div className="w-0 h-0 border-t-[4px] border-t-[#8a6d3b] border-l-[4px] border-l-transparent"></div>
          </div>
        )}