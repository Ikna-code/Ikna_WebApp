import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
export default function AboutUs() {
  // Metallic Gold Gradient Utility Class
  const goldText = "bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent font-bold";

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans antialiased pt-24 md:pt-26">
      <Header/>
      <section>
        <Image
          src="/images/ikna_store_banner_4k.png"
          alt="About Us Hero Image"
          width={1200}
          height={800}
          className="w-full h-auto object-cover"
              />  
      </section>

      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-[60vh] bg-[#840d5c] flex flex-col justify-center items-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-4xl mx-auto z-10 space-y-4">
          <span className={`text-xs uppercase tracking-widest ${goldText}`}>
            Our Story
          </span>
          <h1 className="text-4xl md:text-6xl font-serif text-white leading-tight">
            Luxury isn't a price. <br />
            <span className={`italic font-light ${goldText}`}>
              It's a feeling.
            </span>
          </h1>
          <p className="text-pink-100/80 max-w-lg mx-auto text-sm md:text-base pt-4 border-t border-pink-700/50">
            The story behind Ikna — and the simple question that started it all.
          </p>
        </div>
      </section>

      {/* 2. THE BIG QUESTION SECTION */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center space-y-6">

        <h2 className="text-2xl md:text-3xl font-serif text-[#840d5c] max-w-2xl mx-auto leading-relaxed">
          &ldquo;When we started Ikna, we asked a simple question — why isn't the first thing that touches our skin also the most skin-friendly and luxurious?&rdquo;
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto text-sm md:text-base leading-relaxed italic">
          Lingerie is something we wear every single day, yet most options in the market force a compromise. We saw a clear gap.
        </p>
      </section>

      {/* 3. UPDATED: THE IKNA DIFFERENCE (ENHANCED CARDS & REDUCED SPACE) */}
      <section className="bg-[#fdf2f8] py-16"> {/* Light brand-tinted background to make white cards pop */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10"> {/* Reduced bottom margin */}
            <span className="text-xs uppercase tracking-widest text-[#840d5c] font-bold block mb-2">What We Stand For</span>
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900">The Ikna difference</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="group bg-white border border-[#840d5c]/10 rounded-2xl p-8 text-center space-y-4 shadow-[0_10px_30px_-15px_rgba(132,13,92,0.1)] hover:shadow-[0_20px_40px_-15px_rgba(132,13,92,0.2)] transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto text-2xl group-hover:scale-110 transition-transform">
                🍃
              </div>
              <h4 className="font-serif font-bold text-gray-900 text-lg">Skin-friendly fabrics</h4>
              <p className="text-sm text-gray-500 leading-relaxed">Soft, natural materials that breathe with you, all day long.</p>
            </div>

            {/* Card 2 */}
            <div className="group bg-white border border-[#840d5c]/10 rounded-2xl p-8 text-center space-y-4 shadow-[0_10px_30px_-15px_rgba(132,13,92,0.1)] hover:shadow-[0_20px_40px_-15px_rgba(132,13,92,0.2)] transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-2xl group-hover:scale-110 transition-transform">
                💎
              </div>
              <h4 className="font-serif font-bold text-gray-900 text-lg">Luxury, redefined</h4>
              <p className="text-sm text-gray-500 leading-relaxed">Premium craftsmanship and finishing — without the premium tag.</p>
            </div>

            {/* Card 3 */}
            <div className="group bg-white border border-[#840d5c]/10 rounded-2xl p-8 text-center space-y-4 shadow-[0_10px_30px_-15px_rgba(132,13,92,0.1)] hover:shadow-[0_20px_40px_-15px_rgba(132,13,92,0.2)] transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-12 h-12 rounded-full bg-pink-50 text-[#840d5c] flex items-center justify-center mx-auto text-2xl group-hover:scale-110 transition-transform">
                ❤️
              </div>
              <h4 className="font-serif font-bold text-gray-900 text-lg">Designed for every body</h4>
              <p className="text-sm text-gray-500 leading-relaxed">Inclusive sizing and silhouettes designed for real women.</p>
            </div>

            {/* Card 4 */}
            <div className="group bg-white border border-[#840d5c]/10 rounded-2xl p-8 text-center space-y-4 shadow-[0_10px_30px_-15px_rgba(132,13,92,0.1)] hover:shadow-[0_20px_40px_-15px_rgba(132,13,92,0.2)] transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl group-hover:scale-110 transition-transform">
                ✨
              </div>
              <h4 className="font-serif font-bold text-gray-900 text-lg">Honestly priced</h4>
              <p className="text-sm text-gray-500 leading-relaxed">Direct-to-you pricing, so you pay for the product — not the markup.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BRAND BELIEF SECTION */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl">
            <Image 
              src="/images/about_1.png" 
              alt="Ikna fabric"
              fill
              className="object-cover"
            />
            {/* <div className="absolute bottom-6 left-6 bg-[#840d5c] text-white p-5 rounded-xl shadow-lg">
              <span className={`text-[10px] uppercase tracking-widest block mb-1 ${goldText}`}>Promise</span>
              <p className="text-sm font-medium">Natural fabrics, second-skin feel.</p>
            </div> */}
          </div>

          <div className="space-y-6">
            <span className="text-xs uppercase tracking-widest text-[#840d5c] font-bold">Why Ikna</span>
            <h3 className="text-3xl md:text-4xl font-serif text-gray-900 leading-tight">Built on a simple belief.</h3>
            <p className="text-gray-600 leading-relaxed text-lg">
              We built <span className="text-[#840d5c] font-bold">Ikna</span> to prove that skin-friendly, high-end lingerie doesn't require a luxury markup. Every piece is engineered for all-day comfort.
            </p>
          </div>
        </div>
      </section>

      {/* 5. MISSION BANNER */}
      <section className="w-full bg-[#840d5c] py-20 text-center px-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className={`text-xs uppercase tracking-widest ${goldText}`}>Our Mission</span>
          <p className="text-2xl md:text-3xl font-serif text-white leading-relaxed">
            To make{' '}
            <span className={`italic ${goldText}`}>premium-quality</span>,{' '}
            <span className={`italic ${goldText}`}>beautifully crafted</span>, and incredibly comfortable lingerie accessible to every woman.
          </p>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <span className="text-xs uppercase tracking-widest text-[#840d5c] font-bold">A Note From Us</span>
          <h3 className="text-3xl md:text-4xl font-serif text-gray-900">
            Luxury isn't about price. <br />
            <span className="italic text-[#840d5c]">It's how you feel.</span>
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Every fit, every stitch, and every fabric choice is designed in service of your comfort. Experience the Ikna feeling.
          </p>
          <Link 
            href="/shop" 
            className="inline-block bg-[#840d5c] hover:bg-[#610742] text-white font-bold text-xs tracking-[0.2em] uppercase py-5 px-10 transition-all duration-300 shadow-lg hover:shadow-[#840d5c]/30"
          >
            Explore The Collection
          </Link>
        </div>

        <div className="relative h-[500px] w-[480px] rounded-2xl overflow-hidden">
          <Image 
            src="/images/About_2.png" 
            alt="Ikna Collection"
            fill
            className="object-contain"
          />
        </div>
      </section>
      <Footer/>
    </div>
  );
}