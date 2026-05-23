'use client';
import React from 'react';
import Header from '@/components/layout/Header';

const AboutUs = () => {
  return (
    <div className="bg-[#F9F3F5] min-h-screen">
      <Header />

      {/* 1. HERO SECTION - Minimal & Impactful */}
      <section className="container mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-6xl md:text-8xl font-serif text-[#321327] mb-8 tracking-tighter">
          Ikna
        </h1>
        <div className="w-16 h-[2px] bg-[#d4af37] mx-auto mb-10"></div>
        <p className="max-w-3xl mx-auto text-2xl md:text-3xl font-serif text-[#321327] leading-snug italic opacity-80">
          "Why isn’t the first thing that touches our skin also the most skin-friendly and luxurious?"
        </p>
      </section>

      {/* 2. THE STORY - Split Layout */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-5/12">
            <h2 className="text-xs tracking-[0.4em] text-[#840d5c] uppercase font-bold mb-6">The Origin</h2>
            <p className="text-xl text-[#321327] leading-relaxed font-light">
              Lingerie is something we wear every single day, yet most options in the market force a compromise — 
              either you get comfort, or you get luxury, and almost always at an overpriced tag. 
              <span className="block mt-6 font-semibold text-[#840d5c]">We saw a clear gap.</span>
            </p>
          </div>
          <div className="w-full md:w-7/12">
            <div className="relative group">
              <div className="absolute -inset-4 border border-[#d4af37]/30 translate-x-2 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500"></div>
              <img 
                src="/images/lingerie_manufacture.jpg" 
                alt="Ikna Craft" 
                className="relative z-10 w-full h-[500px] object-cover grayscale-[20%] shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE BRAND - Inverse Split */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-col-reverse md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2 bg-white p-12 shadow-sm border-l-4 border-[#d4af37]">
            <h2 className="text-3xl font-serif text-[#321327] mb-6">Our Creation</h2>
            <p className="text-[#321327] text-lg leading-loose opacity-90">
              So, we built Ikna — a lingerie brand made with natural, skin-friendly fabrics 
              that feel luxurious on your skin, without the luxury price.
            </p>
          </div>
          <div className="w-full md:w-1/2">
            <h2 className="text-xs tracking-[0.4em] text-[#840d5c] uppercase font-bold mb-6 text-right">The Solution</h2>
            <div className="h-[300px] bg-[#321327] flex items-center justify-center p-12">
                <p className="text-[#F9F3F5] text-2xl font-serif text-center leading-relaxed">
                    Luxury isn’t about price — it’s about how you feel in your own skin.
                </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MISSION BANNER */}
      <section className="bg-[#321327] text-[#F9F3F5] py-24 my-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-sm tracking-[0.5em] uppercase mb-8 opacity-60">Our Mission</h2>
          <p className="max-w-4xl mx-auto text-3xl md:text-4xl font-serif leading-tight">
            "To make premium-quality, beautifully crafted, and incredibly comfortable lingerie accessible to every woman."
          </p>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="inline-block relative">
            <button className="px-12 py-5 bg-transparent border-2 border-[#321327] text-[#321327] hover:bg-[#321327] hover:text-white transition-all duration-500 font-bold tracking-widest text-sm uppercase">
                Explore the Ikna Collection
            </button>
            <div className="absolute -bottom-2 -right-2 w-full h-full border border-[#d4af37] -z-10"></div>
        </div>
      </section>

      <style jsx>{`
        .font-serif {
          font-family: 'Playfair Display', serif; /* Ensure you have this font imported or use a standard serif */
        }
      `}</style>
    </div>
  );
};

export default AboutUs;