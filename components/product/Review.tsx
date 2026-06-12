"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { getFeaturedReviews } from '@/backend/actions/review';

interface HomeReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  isVerified: boolean;
  createdAt: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
  };
}

const FALLBACK_AVERAGE = 0;
const FALLBACK_TOTAL = 0;

const ReviewSection = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviews, setReviews] = useState<HomeReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(FALLBACK_AVERAGE);
  const [totalReviews, setTotalReviews] = useState<number>(FALLBACK_TOTAL);

  useEffect(() => {
    let mounted = true;

    const loadFeaturedReviews = async () => {
      try {
        const payload = await getFeaturedReviews(3);
        if (!mounted) return;

        const reviewRows = Array.isArray(payload?.reviews) ? payload.reviews : [];
        const normalizedReviews: HomeReview[] = reviewRows.map((item: any) => ({
          id: String(item?.id || ''),
          rating: Number(item?.rating || 0),
          title: item?.title || null,
          comment: String(item?.comment || ''),
          isVerified: Boolean(item?.isVerified),
          createdAt:
            item?.createdAt instanceof Date
              ? item.createdAt.toISOString()
              : String(item?.createdAt || new Date().toISOString()),
          user: {
            firstName: item?.user?.firstName || null,
            lastName: item?.user?.lastName || null,
          },
        }));

        setReviews(normalizedReviews);
        setAverageRating(Number(payload?.averageRating || 0));
        setTotalReviews(Number(payload?.totalReviews || 0));
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to load featured reviews', error);
        setReviews([]);
        setAverageRating(FALLBACK_AVERAGE);
        setTotalReviews(FALLBACK_TOTAL);
      }
    };

    loadFeaturedReviews();

    return () => {
      mounted = false;
    };
  }, []);

  // Sync scroll position with active dot index
  const handleScroll = () => {
    if (carouselRef.current) {
      const index = Math.round(carouselRef.current.scrollLeft / carouselRef.current.clientWidth);
      setActiveIndex(index);
    }
  };

  const formatAuthor = (firstName?: string | null, lastName?: string | null) => {
    const first = String(firstName || '').trim();
    const last = String(lastName || '').trim();
    const fullName = `${first} ${last}`.trim();
    return fullName || 'Anonymous';
  };

  return (
    <div className="w-full space-y-7 md:space-y-12 py-8 md:py-16 px-4 md:px-12 bg-[#faf3f5] rounded-[3rem] border border-[#840d5c]/5">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-[#840d5c]/10 pb-5 md:pb-8">
        <div className="space-y-2">
          <h3 className="text-[10px] tracking-[0.3em] font-bold uppercase text-[#840d5c]">Testimonials</h3>
          <h2 className="text-2xl md:text-4xl font-serif text-[#321327]">Customer Reviews</h2>
          <div className="flex items-center gap-4 mt-2 md:mt-4">
            <div className="flex text-[#840d5c]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <span className="text-lg font-bold text-[#321327]">{averageRating.toFixed(1)} / 5.0</span>
            <span className="text-xs text-[#840d5c]/60 font-medium">Based on {totalReviews} Reviews</span>
          </div>
        </div>
      </div>

      {/* CAROUSEL BODY */}
      <div className="relative">
        <div 
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory md:snap-none no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className="min-w-full md:min-w-0 snap-center md:snap-start bg-white p-5 md:p-8 rounded-[2.5rem] shadow-[0_10px_40px_rgba(132,13,92,0.03)] border border-white space-y-4 md:space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2 md:gap-3">
                  <div className="flex text-[#840d5c]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} strokeWidth={1} />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#321327]">{formatAuthor(review.user?.firstName, review.user?.lastName)}</span>
                    {review.isVerified && (
                      <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-tighter bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 size={10} /> Verified Buyer
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#840d5c]/30 tracking-widest">
                  {new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="space-y-3 md:space-y-4">
                <h4 className="text-base md:text-lg font-bold text-[#321327] leading-tight">
                  {review.title || 'Loved by IKNA customers'}
                </h4>
                <p className="text-[13px] md:text-[14px] leading-relaxed text-[#522d42] italic opacity-80 font-medium">"{review.comment}"</p>
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
    </div>
  );
};

export default ReviewSection;