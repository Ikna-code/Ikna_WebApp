"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Star, CheckCircle2, ThumbsUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReviewModal from '../../app/reviews/ReviewModal'; // Importing your predefined component

const reviews = [
  {
    id: 1,
    author: "Aditi R.",
    rating: 5,
    date: "March 2026",
    title: "Finally, a bra that doesn't dig in!",
    content: "I've struggled with wire marks for years. The Everyday Seamless is a game changer. It feels like wearing nothing but still gives great shape.",
    fit: "True to size",
    verified: true,
  },
  {
    id: 2,
    author: "Priya M.",
    rating: 5,
    date: "February 2026",
    title: "Very comfortable",
    content: "The fabric is incredibly soft. I used the Fit Quiz and it suggested a Medium—it fits perfectly.",
    fit: "True to size",
    verified: true,
  },
  {
    id: 3,
    author: "Sneha K.",
    rating: 5,
    date: "January 2026",
    title: "Best for everyday wear",
    content: "I bought one to try and ended up buying four more. The plum color is absolutely stunning and the quality is top-notch.",
    fit: "True to size",
    verified: true,
  }
];

const ReviewSection = () => {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Sync scroll position with active dot index
  const handleScroll = () => {
    if (carouselRef.current) {
      const index = Math.round(carouselRef.current.scrollLeft / carouselRef.current.clientWidth);
      setActiveIndex(index);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      carouselRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full space-y-12 py-16 px-6 md:px-12 bg-[#faf3f5] rounded-[3rem] border border-[#840d5c]/5">
      
      {/* --- EXTERNAL REVIEW MODAL --- */}
      {/* {showModal && (
        <ReviewModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      )} */}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#840d5c]/10 pb-8">
        <div className="space-y-2">
          <h3 className="text-[10px] tracking-[0.3em] font-bold uppercase text-[#840d5c]">Testimonials</h3>
          <h2 className="text-4xl font-serif text-[#321327]">Customer Reviews</h2>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex text-[#840d5c]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <span className="text-lg font-bold text-[#321327]">4.9 / 5.0</span>
            <span className="text-xs text-[#840d5c]/60 font-medium">Based on 824 Reviews</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-2 mr-4">
            <button 
              onClick={() => scroll('left')} 
              className="p-3 rounded-full border border-[#840d5c]/20 text-[#840d5c] hover:bg-[#840d5c] hover:text-white transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => scroll('right')} 
              className="p-3 rounded-full border border-[#840d5c]/20 text-[#840d5c] hover:bg-[#840d5c] hover:text-white transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          
          {/* <button 
            onClick={() => setShowModal(true)}
            className="px-10 py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg rounded-full"
          >
            Write A Review
          </button> */}
        </div>
      </div>

      {/* CAROUSEL BODY */}
      <div className="relative">
        <div 
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className="min-w-[100%] md:min-w-[calc(50%-12px)] snap-center bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_10px_40px_rgba(132,13,92,0.03)] border border-white space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-3">
                  <div className="flex text-[#840d5c]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} strokeWidth={1} />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#321327]">{review.author}</span>
                    {review.verified && (
                      <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-tighter bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 size={10} /> Verified Buyer
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#840d5c]/30 tracking-widest">{review.date}</span>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-bold text-[#321327] leading-tight">{review.title}</h4>
                <p className="text-[14px] leading-relaxed text-[#522d42] italic opacity-80 font-medium">"{review.content}"</p>
              </div>


            </div>
          ))}
        </div>

        {/* DOTS NAVIGATION (Visible on Mobile) */}
        <div className="flex justify-center gap-2 mt-2 md:hidden">
          {reviews.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${activeIndex === i ? 'w-6 bg-[#840d5c]' : 'w-2 bg-[#840d5c]/20'}`} 
            />
          ))}
        </div>
      </div>
      
      {/* FOOTER LINK */}
      {/* <div className="text-center pt-8">
        <button 
          className="group flex flex-col items-center mx-auto"
          onClick={() => router.push('/reviews')}
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#840d5c] pb-2 group-hover:tracking-[0.5em] transition-all">
            View All 824 Reviews
          </span>
          <div className="h-[2px] w-12 bg-[#840d5c] group-hover:w-24 transition-all duration-500 rounded-full" />
        </button>
      </div> */}
    </div>
  );
};

export default ReviewSection;