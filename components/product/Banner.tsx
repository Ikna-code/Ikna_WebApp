"use client";

import React from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const Banner = () => {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 4000 })
  ]);

  const slides = [
    {
      id: 1,
      src: '/images/banner_purple.jpeg',
      alt: 'Promotional Banner 1',
      title: '',
      description: '',
    },
    {
      id: 2,
      src: '/images/banner_cream.jpeg',
      alt: 'Promotional Banner 2',
      title: '',
      description: '',
    },
    {
      id: 3,
      src: '/images/banner_black.jpeg',
      alt: 'Promotional Banner 3',
      title: '',
      description: '',
    },
  ];

  return (
    <section className="relative w-full h-[70vh] overflow-hidden bg-gray-100">
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide) => (
            <div 
              key={slide.id} 
              className="relative w-full h-full flex-[0_0_100%] min-w-0 select-none"
            >
              {/* 
                FIX: Swapped object-contain out for object-cover.
                This ensures the images perfectly fill the 100% width and height of the slide container.
              */}
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={slide.id === 1}
                className="object-cover object-center"
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
    </section>
  );
};

export default Banner;