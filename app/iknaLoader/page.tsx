"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const IknaLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#5e0b4d]">
      <div className="relative flex flex-col items-center">
        
        {/* Futuristic Glowing Heart/Ribbon */}
        <motion.svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <motion.path
            d="M50 80 C 20 60, 10 30, 40 20 C 50 15, 60 25, 50 40 C 40 55, 70 80, 90 60"
            fill="transparent"
            strokeWidth="3"
            stroke="white"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: 1, 
              opacity: 1,
              filter: ["drop-shadow(0 0 0px #fff)", "drop-shadow(0 0 10px #ff79c6)", "drop-shadow(0 0 0px #fff)"]
            }}
            transition={{ 
              pathLength: { duration: 2, ease: "easeInOut" },
              opacity: { duration: 0.5 },
              filter: { duration: 2, repeat: Infinity }
            }}
          />
        </motion.svg>

        {/* Brand Name: ikna */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-5xl font-bold tracking-widest text-white lowercase mb-2"
          style={{ fontFamily: 'sans-serif' }}
        >
          ikna
        </motion.h1>

        {/* Tagline with subtle reveal */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="text-sm uppercase tracking-[0.3em] text-pink-200 text-center px-4"
        >
          Hey Beautiful, Embrace Yourself!
        </motion.p>

        {/* Futuristic Scanning Line */}
        <motion.div 
          className="absolute -inset-10 border-t border-white/20"
          initial={{ top: "-10%", opacity: 0 }}
          animate={{ top: "110%", opacity: [0, 1, 0] }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      </div>

      {/* Background Soft Aura */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3] 
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full blur-[100px]"
        />
      </div>
    </div>
  );
};

export default IknaLoader;