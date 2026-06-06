import React from 'react';
import Image from 'next/image';

interface ProductVariant {
  id: number;
  name: string;
  image: string;
  isBestSeller?: boolean;
}

const variants: ProductVariant[] = [
  { id: 1, name: "The Everyday Seamless", image: "/images/banner_1.png", isBestSeller: true },
  { id: 2, name: "The Comfort Lift", image: "/images/banner_1.png" },
  { id: 3, name: "The Dynamic Support", image: "/images/banner_1.png" },
];

const ProductSelection = () => {
  return (
    <div className="w-full space-y-4 px-0 md:px-0">
      {/* Header section with responsive text sizing */}
      <div className="flex items-center justify-between">
        <h3 className="text-[9px] md:text-[10px] tracking-[0.2em] font-bold uppercase text-ikna-muted">
          Select Variety
        </h3>
        <span className="text-[9px] md:text-[10px] text-ikna-brown font-medium">
          3 Varieties Available
        </span>
      </div>

      {/* 
          Container logic: 
          - Mobile: Horizontal scroll with 'snapping' and 'peeking' (w-40 vs screen width)
          - Desktop: Standard 3-column grid
      */}
<div className="
    flex overflow-x-auto gap-2 pb-3 
    snap-x snap-mandatory scroll-smooth no-scrollbar 
    md:grid md:grid-cols-3 md:gap-4 md:pb-0 md:overflow-visible
  ">
    {variants.map((variant) => (
      <button
        key={variant.id}
        className="
          group relative flex-shrink-0 
          flex flex-col /* Added: Turns the button into a vertical flex column */
          w-[40%] sm:w-[35%] md:w-full 
          snap-start transition-all duration-300
        "
      >
        {/* Image Thumbnail */}
        <div className="relative w-full aspect-square md:aspect-[3/4] overflow-hidden bg-ikna-cream border border-gray-100 group-hover:border-ikna-brown/30 transition-all flex-shrink-0">
          <Image
            src={variant.image}
            alt={variant.name}
            fill
            sizes="320px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Responsive Badge */}
          {variant.isBestSeller && (
            <div className="absolute top-1 right-1 bg-ikna-brown text-white text-[7px] md:text-[9px] px-1 py-0.5 uppercase tracking-wider z-10">
              Best Seller
            </div>
          )}
        </div>

        {/* Label - Fixed height prevents misalignment when text wraps */}
        <div className="mt-2 text-left h-[28px] md:h-[32px] flex-grow">
          <p className="text-[8px] md:text-[10px] font-bold leading-tight uppercase group-hover:text-ikna-brown transition-colors">
            <span className="opacity-50 mr-1">{variant.id}.</span> {variant.name}
          </p>
        </div>

        {/* Active Indicator - Kept at the absolute bottom of the synchronized button height */}
        <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-ikna-brown transition-all duration-300 group-focus:w-full group-active:w-full" />
      </button>
    ))}
</div>
    </div>
  );
};

export default ProductSelection;