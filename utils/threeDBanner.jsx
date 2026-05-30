"use client";

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from 'framer-motion';
import { IMAGE_BASE_URL } from '@/public/constants/constants';

const PerspectiveGallery = ({ products, children }) => {
  const containerRef = useRef(null);
  const [isWhiteSectionActive, setIsWhiteSectionActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Amplified spread values to strictly separate the cards away from the center
  const [maxFarSpread, setMaxFarSpread] = useState(550);
  const [maxNearSpread, setMaxNearSpread] = useState(280);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        // FIXED FOR 100% VISIBILITY:
        // Center card is 96px wide (positioned at center 0).
        // Inner cards are 64px wide. To have 0% overlap, they must sit exactly next to the center.
        // Center edge is at 48px (96/2). Inner card center needs to be at 48px + 32px (64/2) = 80px.
        // Far cards are 48px wide. Their center needs to sit at 80px + 32px + 24px = 136px.
        setMaxFarSpread(136); 
        setMaxNearSpread(80);  
      } else {
        setIsMobile(false);
        setMaxFarSpread(550);
        setMaxNearSpread(280);
      }
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
  
  const spreadXFar = useTransform(smoothProgress, [0, cardAnimationEnd], [0, maxFarSpread]);
  const spreadXNear = useTransform(smoothProgress, [0, cardAnimationEnd], [0, maxNearSpread]);
  
  // FIXED FOR 100% VISIBILITY: Flattened rotation on mobile (0deg) so images face completely flat 
  const rotateSideFar = useTransform(smoothProgress, [0, cardAnimationEnd], [0, isMobile ? 0 : 45]);
  const rotateSideNear = useTransform(smoothProgress, [0, cardAnimationEnd], [0, isMobile ? 0 : 25]);
  
  // FIXED FOR 100% VISIBILITY: Standardized depth layers on mobile so layers don't cross into each other via perspective
  const centerDepth = useTransform(smoothProgress, [0, cardAnimationEnd], [100, isMobile ? 100 : 350]);

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
          <h1 className="text-6xl md:text-[9rem] font-serif text-[#F9F3F5] leading-none">Elevate</h1>
          <p className="text-[#ffbec6] tracking-[1.2em] uppercase text-[9px] md:text-xs font-bold mt-4">The New Dimension</p>
        </motion.div>

        {/* 3D Stage */}
        <div 
          className="relative w-full h-[280px] md:h-[450px] flex items-center justify-center" 
          style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        >
          
          {/* FAR LEFT */}
          <motion.div 
            style={{ x: useTransform(spreadXFar, v => -v), translateZ: isMobile ? -20 : -120, rotateY: rotateSideFar }}
            className="absolute w-12 h-24 md:w-44 md:h-64 rounded-xl overflow-hidden shadow-2xl border border-white/10"
          >
            <img src={'/images/sample images/brown_modal.jpeg'} className="w-full h-full object-cover" alt="" />
          </motion.div>

          {/* INNER LEFT */}
          <motion.div 
            style={{ x: useTransform(spreadXNear, v => -v), translateZ: isMobile ? -10 : 20, rotateY: rotateSideNear }}
            className="absolute w-16 h-32 md:w-52 md:h-72 rounded-xl overflow-hidden shadow-2xl border border-white/20 z-20"
          >
            <img src={`${IMAGE_BASE_URL}/${products[1]?.image}`} className="w-full h-full object-cover" alt="" />
          </motion.div>

          {/* CENTER */}
          <motion.div 
            style={{ 
              translateZ: centerDepth, 
              scale: useTransform(smoothProgress, [0, 0.7], [1, isMobile ? 1 : 115]) 
            }}
            className="relative group w-24 h-44 md:w-64 md:h-96 rounded-2xl overflow-hidden border-2 border-[#ffbec6]/40 shadow-2xl z-40"
          >
            <img src={'/images/sample images/Elevate_Center.png'} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#43012a] via-[#321327]/40 to-transparent" />
          </motion.div>

          {/* INNER RIGHT */}
          <motion.div 
            style={{ x: spreadXNear, translateZ: isMobile ? -10 : 20, rotateY: useTransform(rotateSideNear, v => -v) }}
            className="absolute w-16 h-32 md:w-52 md:h-72 rounded-xl overflow-hidden shadow-2xl border border-white/20 z-20"
          >
            <img 
              src={`${IMAGE_BASE_URL}/${products[2]?.image}`} 
              className="w-full h-full object-cover" 
              alt={products[2]?.name} 
            />
          </motion.div>

          {/* FAR RIGHT */}
          <motion.div 
            style={{ x: spreadXFar, translateZ: isMobile ? -20 : -120, rotateY: useTransform(transform => -transform) }}
            style={{ x: spreadXFar, translateZ: isMobile ? -20 : -120, rotateY: useTransform(rotateSideFar, v => -v) }}
            className="absolute w-12 h-24 md:w-44 md:h-64 rounded-xl overflow-hidden shadow-2xl border border-white/10"
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