"use client";

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion';
import { IMAGE_BASE_URL } from '@/public/constants/constants';

const resolveImageSrc = (pathOrUrl) => {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL : `${IMAGE_BASE_URL}/`;
  return `${base}${value.replace(/^\/+/, '')}`;
};

const PerspectiveGallery = ({ products, children }) => {
  const containerRef = useRef(null);
  const [isWhiteSectionActive, setIsWhiteSectionActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  
  const HEADER_HEIGHT = "80px"; 

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setIsWhiteSectionActive(latest >= 0.995);
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const cardAnimationEnd = 0.7;
  
  // PERCENTAGE-BASED RELATIVE TRACKING: Ensures flawless 1% overlap bounds across all screen widths
  // Near cards move out by 74% of their width. Far cards move out by 148%.
  const spreadNearPercent = useTransform(smoothProgress, [0, cardAnimationEnd], [0, 74]);
  const spreadFarPercent = useTransform(smoothProgress, [0, cardAnimationEnd], [0, 148]);
  
  // Turn numerical progression into clean CSS percentage strings for Framer Motion
  const xLeftFar = useTransform(spreadFarPercent, v => `-${v}%`);
  const xLeftNear = useTransform(spreadNearPercent, v => `-${v}%`);
  const xRightNear = useTransform(spreadNearPercent, v => `${v}%`);
  const xRightFar = useTransform(spreadFarPercent, v => `${v}%`);
  
  // Uniform perspective step scaling
  const scaleSideFar = useTransform(smoothProgress, [0, cardAnimationEnd], [1, 0.80]);
  const scaleSideNear = useTransform(smoothProgress, [0, cardAnimationEnd], [1, 0.90]);
  const scaleCenter = useTransform(smoothProgress, [0, cardAnimationEnd], [1, isMobile ? 1 : 1.05]);

  const whiteSectionY = useTransform(smoothProgress, [0.7, 1], ["100vh", "0vh"]);

  return (
    <div 
      ref={containerRef} 
      className="relative h-[400vh] bg-[#321327]"
    >
      <section 
        style={{ top: HEADER_HEIGHT, height: `calc(100vh - ${HEADER_HEIGHT})` }}
        className="sticky w-full flex flex-col items-center justify-center overflow-hidden"
      >
        
        {/* Background Ambience */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] max-w-[800px] max-h-[800px] bg-[#840d5c]/20 blur-[120px] md:blur-[150px] rounded-full" />
        </div>

        {/* Header */}
        <motion.div 
          style={{ opacity: useTransform(smoothProgress, [0.7, 0.85], [1, 0]) }}
          className="relative z-10 text-center mb-4 md:mb-10"
        >
          <h1 className="text-5xl md:text-[7rem] font-serif text-[#F9F3F5] leading-none">Elevate</h1>
          <p className="text-[#ffbec6] tracking-[1.2em] uppercase text-[9px] md:text-xs font-bold mt-4">The New Dimension</p>
        </motion.div>

        {/* Dynamic Staging Stage Wrapper */}
        <div className="relative w-full h-[280px] md:h-[450px] flex items-center justify-center mx-auto max-w-7xl">
          
          {/* FAR LEFT (Underneath layer) */}
          <motion.div 
            style={{ 
              x: xLeftFar,
              scale: scaleSideFar 
            }}
            className="absolute w-24 h-44 md:w-56 md:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-10"
          >
            <img src={'/images/sample images/brown_modal.jpeg'} className="w-full h-full object-cover" alt="" />
          </motion.div>

          {/* INNER LEFT (Middle layer) */}
          <motion.div 
            style={{ 
              x: xLeftNear,
              scale: scaleSideNear
            }}
            className="absolute w-24 h-44 md:w-56 md:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-20"
          >
            <img src={'/images/sample images/Left_center.jpeg'} className="w-full h-full object-cover" alt="" />
          </motion.div>

          {/* CENTER CARD (Top priority layer) */}
          <motion.div 
            style={{ 
              scale: scaleCenter
            }}
            className="relative group w-24 h-44 md:w-56 md:h-96 rounded-2xl overflow-hidden border-2 border-[#ffbec6]/40 shadow-2xl z-30"
          >
            <img src={'/images/sample images/Elevate_Center.png'} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#43012a] via-[#321327]/40 to-transparent" />
          </motion.div>

          {/* INNER RIGHT (Middle layer) */}
          <motion.div 
            style={{ 
              x: xRightNear,
              scale: scaleSideNear
            }}
            className="absolute w-24 h-44 md:w-56 md:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-20"
          >
            <img 
              src={'/images/sample images/Right_center.jpeg'} 
              className="w-full h-full object-cover" 
              alt={products[2]?.name} 
            />
          </motion.div>

          {/* FAR RIGHT (Underneath layer) */}
          <motion.div 
            style={{ 
              x: xRightFar,
              scale: scaleSideFar
            }}
            className="absolute w-24 h-44 md:w-56 md:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-10"
          >
            <img src={'/images/sample images/IMG_1502.jpeg'} className="w-full h-full object-cover" alt="" />
          </motion.div>
        </div>

        {/* THE WHITE SECTION */}
        <motion.div 
          style={{ y: whiteSectionY }}
          className={`absolute inset-0 z-[100] bg-[#F9F3F5] shadow-[0_-20px_50px_rgba(0,0,0,0.3)] ${
            isWhiteSectionActive
              ? 'overflow-y-auto overscroll-y-contain pointer-events-auto touch-pan-y hide-scrollbar'
              : 'overflow-hidden pointer-events-none touch-none'
          }`}
        >
          <div className="max-w-8xl mx-auto py-12 px-4 text-[#321327]">
            {children}
          </div>
        </motion.div>
      </section>
      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default PerspectiveGallery;