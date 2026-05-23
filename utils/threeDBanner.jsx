"use client";

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { IMAGE_BASE_URL } from '@/public/constants/constants';

const PerspectiveGallery = ({ products, children }) => {
  console.log("Products in PerspectiveGallery:", products);
  const containerRef = useRef(null);
  
  // ADJUST THIS: Set this to the height of your sticky header
  const HEADER_HEIGHT = "80px"; 

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // PHASE 1: CARD ANIMATION (Ends at 0.7 scroll)
  const cardAnimationEnd = 0.7;
  
  const spreadXFar = useTransform(smoothProgress, [0, cardAnimationEnd], [0, 550]);
  const spreadXNear = useTransform(smoothProgress, [0, cardAnimationEnd], [0, 280]);
  const rotateSideFar = useTransform(smoothProgress, [0, cardAnimationEnd], [0, 45]);
  const rotateSideNear = useTransform(smoothProgress, [0, cardAnimationEnd], [0, 25]);
  const centerDepth = useTransform(smoothProgress, [0, cardAnimationEnd], [100, 350]);

  // PHASE 2: WHITE SECTION SLIDE (Starts only after 0.7 scroll)
  const whiteSectionY = useTransform(smoothProgress, [0.7, 1], ["100vh", "0vh"]);

  return (
    <div 
      ref={containerRef} 
      className="relative h-[400vh] bg-[#321327]"
    >
      {/* 1. top-[80px]: Prevents the section from sliding under your header.
          2. h-[calc(100vh-80px)]: Makes the dark section fill exactly the remaining screen space.
      */}
      <section 
        style={{ top: HEADER_HEIGHT, height: `calc(100vh - ${HEADER_HEIGHT})` }}
        className="sticky w-full flex flex-col items-center justify-center overflow-hidden"
      >
        
        {/* Background Ambience */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#840d5c]/20 blur-[150px] rounded-full" />
        </div>

        {/* Header - Fades out as the white section approaches */}
        <motion.div 
          style={{ opacity: useTransform(smoothProgress, [0.7, 0.85], [1, 0]) }}
          className="relative z-10 text-center mb-10"
        >
          <h1 className="text-7xl md:text-[9rem] font-serif text-[#F9F3F5] leading-none">Elevate</h1>
          <p className="text-[#ffbec6] tracking-[1.2em] uppercase text-[10px] md:text-xs font-bold mt-4">The New Dimension</p>
        </motion.div>

        {/* 3D Stage */}
        <div 
          className="relative w-full h-[450px] flex items-center justify-center" 
          style={{ perspective: '2000px', transformStyle: 'preserve-3d' }}
        >
          
          {/* FAR LEFT */}
          <motion.div 
            style={{ x: useTransform(spreadXFar, v => -v), translateZ: -100, rotateY: rotateSideFar }}
            className="absolute w-32 h-48 md:w-44 md:h-64 rounded-xl overflow-hidden shadow-2xl border border-white/10"
          >
            <img src={`${IMAGE_BASE_URL}/${products[0]?.image}`} className="w-full h-full object-cover" alt="" />
          </motion.div>

          {/* INNER LEFT */}
          <motion.div 
            style={{ x: useTransform(spreadXNear, v => -v), translateZ: 100, rotateY: rotateSideNear }}
            className="absolute w-40 h-56 md:w-52 md:h-72 rounded-xl overflow-hidden shadow-2xl border border-white/20 z-20"
          >
            <img src={`${IMAGE_BASE_URL}/${products[1]?.image}`} className="w-full h-full object-cover" alt="" />
          </motion.div>

          {/* CENTER */}
<motion.div 
  style={{ 
    translateZ: centerDepth, 
    scale: useTransform(smoothProgress, [0, 0.7], [1, 1.15]) 
  }}
  className="relative group w-52 h-80 md:w-64 md:h-96 rounded-2xl overflow-hidden border-2 border-[#ffbec6]/40 shadow-2xl z-40"
>
  {/* The Base Image */}
  <img 
    src={`${IMAGE_BASE_URL}/${products[2]?.image}`} 
    className="w-full h-full object-cover" 
    alt={products[2]?.name} 
  />

  {/* 1. Permanent Dark Gradient (Bottom weighted) */}
  <div className="absolute inset-0 bg-gradient-to-t from-[#43012a] via-[#321327]/40 to-transparent" />

  {/* 2. Hover Interaction Overlay (Darkened & Blurred) */}
  {/* <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" /> */}

  {/* 3. Text Content Overlay */}
  <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
    <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Premium Collection</p>
    <h3 className="text-xl font-semibold tracking-tight">{products[2]?.name || 'Product Title'}</h3>
  </div>
</motion.div>
          {/* INNER RIGHT */}
          <motion.div 
            style={{ x: spreadXNear, translateZ: 100, rotateY: useTransform(rotateSideNear, v => -v) }}
            className="absolute w-40 h-56 md:w-52 md:h-72 rounded-xl overflow-hidden shadow-2xl border border-white/20 z-20"
          >
            <img src={`${IMAGE_BASE_URL}/${products[3]?.image}`} className="w-full h-full object-cover" alt="" />
          </motion.div>

          {/* FAR RIGHT */}
          <motion.div 
            style={{ x: spreadXFar, translateZ: -100, rotateY: useTransform(rotateSideFar, v => -v) }}
            className="absolute w-32 h-48 md:w-44 md:h-64 rounded-xl overflow-hidden shadow-2xl border border-white/10"
          >
            <img src={`${IMAGE_BASE_URL}/${products[10]?.image}`} className="w-full h-full object-cover" alt="" />
          </motion.div>
        </div>

        {/* THE WHITE SECTION (Slides up) */}
        <motion.div 
          style={{ y: whiteSectionY }}
          className="absolute inset-0 z-[100] bg-[#F9F3F5]   shadow-[0_-20px_50px_rgba(0,0,0,0.3)] overflow-y-auto"
        >
          <div className="max-w-7xl mx-auto py-12 px-4 text-[#321327]">
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