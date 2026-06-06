"use client";
import React from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const BannerSection = () => {
  return (
    <section className="relative w-full bg-[#E5D9D3] overflow-hidden py-16 lg:py-24">
      <div className="container mx-auto px-4 relative">
        
        {/* THE 3D CANVAS WRAPPER */}
        <div className="relative flex flex-col lg:flex-row items-center justify-between min-h-[500px]">
          
          {/* LEFT: THE ARCH & MODEL (The "3D" element) */}
          <div className="relative w-full lg:w-1/2 flex justify-center lg:justify-start perspective-1000">
            {/* The Background Arch Structure */}
            <div className="relative w-[300px] h-[450px] md:w-[400px] md:h-[550px] bg-[#D7C7C0] rounded-t-full shadow-[inset_10px_10px_40px_rgba(0,0,0,0.1)] overflow-hidden transition-transform duration-700 hover:rotate-y-12">
              
              {/* The Inner Arch (Creates depth) */}
              <div className="absolute inset-4 border-2 border-white/20 rounded-t-full pointer-events-none" />

              {/* The Model Image */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[95%]">
                <Image
                  src="/images/satinDress.avif"
                  alt="IKNA Comfort"
                  fill
                  sizes="600px"
                  className="object-contain object-bottom drop-shadow-2xl"
                  priority
                />
              </div>
            </div>

            {/* Floating Decorative Elements */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-3xl" />
          </div>

          {/* RIGHT: THE CONTENT WITH DEPTH */}
          <div className="w-full lg:w-1/2 mt-12 lg:mt-0 space-y-8 z-20">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-serif text-ikna-dark leading-[1.1] drop-shadow-sm">
                IKNA: THE BRA THAT <br /> 
                <span className="text-ikna-brown italic">UNDERSTANDS YOU.</span>
              </h1>
              
              <div className="flex items-center gap-4 text-sm md:text-lg tracking-[0.2em] font-medium text-ikna-muted">
                <span>SOLUTION.</span>
                <span className="w-1 h-1 bg-ikna-brown rounded-full" />
                <span>SUPPORT.</span>
                <span className="w-1 h-1 bg-ikna-brown rounded-full" />
                <span>STYLE.</span>
              </div>
            </div>

            {/* Requirement 8: CTA to Start Quiz */}
            <div className="pt-4">
              <button className="group relative flex items-center gap-6 bg-ikna-brown hover:bg-ikna-dark text-white px-8 py-5 transition-all duration-300 shadow-[10px_10px_0px_#C4B2AA] hover:shadow-none hover:translate-x-2 hover:translate-y-2">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">
                  Start Your Fit Quiz
                </span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-2" />
              </button>
            </div>
          </div>

        </div>

        {/* BACKGROUND 3D STRIPES (Optional) */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1/4 h-1 bg-ikna-brown/10 hidden lg:block" />
      </div>
    </section>
  );
};

export default BannerSection;