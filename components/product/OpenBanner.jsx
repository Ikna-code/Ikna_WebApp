"use client";
import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

// Palette 3: Deep Wine (Warm, Moody & Theatrical)
const BERRY_GLOW = "#bd1581";   // Vibrant Highlight
const RASPBERRY = "#960d66";    // Warm Mid-tone
const BASE_PLUM = "#7a0a53";    // Your Core Color
const NOIR_PLUM = "#26021a";    // The "Black Hole" shadow
const CURTAIN_COLOR = "#470B2B"; 

const OpenBanner = () => {
  const [isOpened, setIsOpened] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0); 
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpened(true), 500);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -15, y: x * 15 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const scrollOffset = scrollY * 0.1;

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[500px] md:h-[650px] overflow-hidden"
      style={{ perspective: '2000px', backgroundColor: NOIR_PLUM }}
    >

      {/* --- 1. THE VELVET CURTAINS --- */}
      <div className="absolute inset-0 z-50 pointer-events-none flex">
        <div 
          className="relative h-full w-1/2 transition-transform duration-[2500ms] ease-in-out origin-left shadow-[25px_0_80px_rgba(0,0,0,0.95)]"
          style={{ 
            backgroundColor: CURTAIN_COLOR,
            transform: isOpened ? 'rotateY(-118deg) scaleX(0.2) translateX(-15%)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Heavy dramatic shadow on curtains */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
        </div>

        <div 
          className="relative h-full w-1/2 transition-transform duration-[2500ms] ease-in-out origin-right shadow-[-25px_0_80px_rgba(0,0,0,0.95)]"
          style={{ 
            backgroundColor: CURTAIN_COLOR,
            transform: isOpened ? 'rotateY(118deg) scaleX(0.2) translateX(15%)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-transparent to-black/40" />
        </div>
      </div>

      {/* --- 2. THE REVEALED DEEP WINE BACKGROUND --- */}
      <div className="absolute inset-0 z-10">
        <div className="absolute inset-0 bg-wine-gradient" />
        {/* Adds a slight "heat" shimmer or vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.5)_100%)]" />
      </div>

      {/* --- 3. FLOATING 3D CARDS --- */}
      <div 
        className="container mx-auto h-full px-4 relative z-20 flex items-center justify-center gap-4 md:gap-12"
        style={{ 
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.25s ease-out'
        }}
      >
        {/* Card 1 */}
        <div 
          className={`relative w-28 h-40 md:w-56 md:h-80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-[1500ms] delay-500 ${isOpened ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
          style={{ transform: `translateZ(70px) rotateY(-14deg)` }}
        >
          <Image src="/images/product_photos/2/IMG_9502.jpg" alt="Model 1" fill sizes="600px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        </div>

        {/* Card 2 (Center - High Gloss) */}
        <div 
          className={`relative w-36 h-52 md:w-72 md:h-[450px] rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)] transition-all duration-[1500ms] delay-[800ms] ${isOpened ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'}`}
          style={{ transform: `translateZ(220px) translateY(${-scrollOffset * 0.6}px)` }}
        >
          <Image src="/images/product_photos/6/IMG_9596.jpg" alt="Model 2" fill sizes="600px" className="object-cover" />
          {/* Subtle magenta rim light effect */}
          <div className="absolute inset-0 border border-white/5 rounded-2xl" />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10" />
        </div>

        {/* Card 3 */}
        <div 
          className={`relative w-28 h-40 md:w-56 md:h-80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-[1500ms] delay-[1100ms] ${isOpened ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
          style={{ transform: `translateZ(70px) rotateY(14deg)` }}
        >
          <Image src="/images/product_photos/3/IMG_9535.jpg" alt="Model 3" fill sizes="600px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        </div>
      </div>

      {/* Heavy Stage Floor */}
      <div className="absolute bottom-0 w-full h-48 bg-gradient-to-t from-black via-black/60 to-transparent z-15" />

      <style jsx>{`
        .bg-wine-gradient {
          background: radial-gradient(
            circle at center,
            ${BERRY_GLOW} 0%,
            ${RASPBERRY} 20%,
            ${BASE_PLUM} 50%,
            ${NOIR_PLUM} 100%
          );
        }
      `}</style>
    </section>
  );
};

export default OpenBanner;