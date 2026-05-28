"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const Banner = () => {
  // 1. Capture emblaApi to control manual scrolling
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false })
  ]);

  // Optional: Track if buttons should be disabled (useful if loop is set to false later)
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const slides = [
    {
      id: 0,
      src: '/images/Banner_Image_Final.png',
      alt: 'Promotional Banner 0',
      title: '',
      description: '',
    },
    {
      id: 1,
      src: '/images/Coupon_1.png',
      alt: 'Promotional Banner 1',
      title: '',
      description: '',
    },
    {
      id: 2,
      src: '/images/Feather_Banner_Final.png',
      alt: 'Promotional Banner 2',
      title: '',
      description: '',
    },
  ];

  // 2. Navigation click functions
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // 3. Monitor carousel status to handle button states dynamically
  const onSelect = useCallback((emblaApi: any) => {
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="relative w-full h-[86vh] overflow-hidden bg-gray-100 group">
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide) => (
            <div 
              key={slide.id} 
              className="relative w-full h-full flex-[0_0_100%] min-w-0 select-none"
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={slide.id === 0}
                quality={100}
                className="object-contain object-center h-auto w-auto"
              />

              {(slide.title || slide.description) && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-center">
                  <div className="text-white px-4">
                    {slide.title && (
                      <h1 className="text-3xl md:text-5xl font-bold mb-4">
                        {slide.title}
                      </h1>
                    )}
                    {slide.description && (
                      <p className="text-lg md:text-xl mb-6">
                        {slide.description}
                      </p>
                    )}
                    <button className="bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-gray-200 transition-colors">
                      Shop Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Left Navigation Arrow */}
      <button
        onClick={scrollPrev}
        disabled={prevBtnDisabled}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/30 hover:bg-black/40 text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100 disabled:opacity-0"
        aria-label="Previous slide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* 5. Right Navigation Arrow */}
      <button
        onClick={scrollNext}
        disabled={nextBtnDisabled}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/30 hover:bg-black/40 text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100 disabled:opacity-0"
        aria-label="Next slide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </section>
  );
};

export default Banner;