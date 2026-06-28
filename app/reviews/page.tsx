"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Star, CheckCircle2, ThumbsUp, ChevronLeft, Filter, Trash2, Edit, X } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import ReviewModal from './ReviewModal';
import { getReviews, deleteReview, createReview, updateReview } from '@/backend/actions/review';
import { useStore } from '@/store/useStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface Review {
  id: string;
  userId: string;
  rating: number;
  title: string | null;
  comment: string;
  images: Array<{ id: string; url: string }>;
  isVerified: boolean;
  createdAt: string;
  helpful: number;
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
}

const ReviewsPage = ({
  productId,
  openComposerSignal = 0,
  onSummaryChange,
}: {
  productId: string;
  openComposerSignal?: number;
  onSummaryChange?: (summary: ReviewSummary) => void;
}) => {
  const PRODUCT_ID = productId || '';
  const isStandalonePage = !productId;

  const user = useStore((state) => state.user);
  const userId = user?.id || null;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [previewMediaItems, setPreviewMediaItems] = useState<Array<{ id: string; url: string; type: 'image' | 'video'; poster?: string }>>([]);
  const [previewMediaIndex, setPreviewMediaIndex] = useState(0);
  
  const router = useRouter();

  const fetchReviews = useCallback(async () => {
    if (!PRODUCT_ID) return;
    try {
      const ratingFilter = activeFilter === '5 Star' 
      ? 5 : activeFilter === '4 Star' ? 4 : activeFilter === '3 Star' ? 3 : activeFilter === '2 Star' ? 2 : activeFilter === '1 Star' ? 1 : undefined;
      const data = await getReviews(PRODUCT_ID, ratingFilter);
      
      const formattedData: Review[] = data.map((item: any) => ({
        ...item,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      }));
      setReviews(formattedData);
    } catch (error) {
      console.error('Failed to fetch reviews from database', error);
    }
  }, [activeFilter, PRODUCT_ID]);

  const fetchReviewSummary = useCallback(async () => {
    if (!PRODUCT_ID) return;

    try {
      const allData = await getReviews(PRODUCT_ID);
      const allReviews: Review[] = allData.map((item: any) => ({
        ...item,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      }));

      const total = allReviews.length;
      const sum = allReviews.reduce((acc, review) => acc + (Number(review.rating) || 0), 0);
      const nextCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      allReviews.forEach((review) => {
        const rating = Number(review.rating) || 0;
        if (rating >= 1 && rating <= 5) {
          nextCounts[rating] += 1;
        }
      });

      setTotalReviewCount(total);
      setAverageRating(total > 0 ? sum / total : 0);
      setRatingCounts(nextCounts);
      onSummaryChange?.({
        totalReviews: total,
        averageRating: total > 0 ? sum / total : 0,
      });
    } catch (error) {
      console.error('Failed to fetch review summary from database', error);
      setTotalReviewCount(0);
      setAverageRating(0);
      setRatingCounts({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      onSummaryChange?.({ totalReviews: 0, averageRating: 0 });
    }
  }, [PRODUCT_ID, onSummaryChange]);

  useEffect(() => {
    if (PRODUCT_ID) {
      fetchReviews();
      fetchReviewSummary();
    }
  }, [fetchReviews, fetchReviewSummary, PRODUCT_ID]);

  useEffect(() => {
    if (!openComposerSignal) return;
    if (!userId) {
      alert('Please log in to write a review.');
      return;
    }

    setEditingReview(null);
    setIsModalOpen(true);
  }, [openComposerSignal, userId]);

  const closePreviewModal = () => {
    setPreviewMediaItems([]);
    setPreviewMediaIndex(0);
  };

  const hasPreviewMedia = previewMediaItems.length > 0;
  const activePreviewMedia = hasPreviewMedia ? previewMediaItems[previewMediaIndex] : null;

  const goToPreviousPreviewMedia = () => {
    if (!previewMediaItems.length) return;
    setPreviewMediaIndex((current) =>
      current === 0 ? previewMediaItems.length - 1 : current - 1
    );
  };

  const goToNextPreviewMedia = () => {
    if (!previewMediaItems.length) return;
    setPreviewMediaIndex((current) =>
      current === previewMediaItems.length - 1 ? 0 : current + 1
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePreviewModal();
        return;
      }
      if (event.key === 'ArrowLeft') {
        goToPreviousPreviewMedia();
        return;
      }
      if (event.key === 'ArrowRight') {
        goToNextPreviewMedia();
      }
    };

    if (hasPreviewMedia) {
      document.addEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [hasPreviewMedia, previewMediaItems.length]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    if (!userId) {
      alert("You must be logged in to delete a review.");
      return;
    }

    try {
      await deleteReview(reviewId, userId);
      setReviews(reviews.filter((review) => review.id !== reviewId));
    } catch (error: any) {
      alert(error.message || 'Failed to delete review');
    }
  };

  const handleOpenEdit = (review: Review) => {
    setEditingReview(review);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    if (!userId) {
      alert('Please log in to write a review.');
      return;
    }

    if (!PRODUCT_ID || PRODUCT_ID.trim() === '') {
      alert('Please navigate to a specific product page to write a review.');
      return;
    }

    setEditingReview(null);
    setIsModalOpen(true);
  };

  const activeCount = reviews.length;

  const getReviewerName = (review: Review) => {
    const first = String(review.user?.firstName || '').trim();
    const last = String(review.user?.lastName || '').trim();
    const fullName = `${first} ${last}`.trim();
    return fullName || 'Anonymous';
  };

  const isVideoUrl = (url: string) => {
    const normalized = String(url || '').toLowerCase();
    return (
      normalized.includes('/video/upload/') ||
      /\.(mp4|webm|mov)(\?|#|$)/.test(normalized)
    );
  };

  const sanitizeMediaUrl = (url: string) => {
    const value = String(url || '').trim();
    if (!value) return '';
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
      return parsed.toString();
    } catch {
      return '';
    }
  };

  const toCloudinaryVideoPoster = (url: string) => {
    const sanitized = sanitizeMediaUrl(url);
    if (!sanitized) return '';
    if (!sanitized.includes('/video/upload/')) return '';
    return sanitized.replace('/video/upload/', '/video/upload/so_0,q_auto,f_jpg,w_480/');
  };

  const content = (
<div className="bg-[#FAF3F5] min-h-screen">
  <ReviewModal 
    isOpen={isModalOpen} 
    onClose={() => {
      setIsModalOpen(false);
      fetchReviews();
      fetchReviewSummary();
    }}
    reviewData={editingReview}
    productId={PRODUCT_ID}
    userId={userId || ""}
  />

  {activePreviewMedia && (
    <div className="fixed inset-0 z-140 flex items-center justify-center p-4 md:p-8" role="dialog" aria-modal="true" aria-label="Media preview">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={closePreviewModal}
        aria-label="Close media preview"
      />

      <div className="relative z-141 w-full max-w-5xl">
        <button
          type="button"
          onClick={closePreviewModal}
          className="absolute -top-12 right-0 rounded-full bg-white/15 p-2.5 text-white hover:bg-white/25"
          aria-label="Close preview"
        >
          <X size={18} />
        </button>

        {previewMediaItems.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPreviousPreviewMedia}
              className="absolute left-2 top-1/2 z-150 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-2xl font-bold text-white transition-colors hover:bg-black/75"
              aria-label="Previous media"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToNextPreviewMedia}
              className="absolute right-2 top-1/2 z-150 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-2xl font-bold text-white transition-colors hover:bg-black/75"
              aria-label="Next media"
            >
              ›
            </button>
          </>
        )}

        <div className="overflow-hidden rounded-2xl bg-black shadow-2xl">
          {activePreviewMedia.type === 'video' ? (
            <video
              src={activePreviewMedia.url}
              poster={activePreviewMedia.poster}
              className="max-h-[80vh] w-full bg-black"
              controls
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={activePreviewMedia.url}
              alt="Review media preview"
              className="max-h-[80vh] w-full object-contain"
              loading="eager"
            />
          )}
        </div>

        {previewMediaItems.length > 1 && (
          <p className="mt-3 text-center text-xs font-semibold tracking-wide text-white/85">
            {previewMediaIndex + 1} / {previewMediaItems.length}
          </p>
        )}
      </div>
    </div>
  )}
  
  <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6 md:py-8">
    {/* Header Card: Stacked on mobile, 3-cols on LG */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 bg-white p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border border-[#840d5c]/5 mb-8 md:mb-12">
      
      {/* Title Section */}
      <div className="space-y-3 md:space-y-4 text-center lg:text-left">
        <h3 className="text-[10px] tracking-[0.3em] font-bold uppercase text-[#840d5c]">The IKNA Experience</h3>
        <h1 className="text-3xl md:text-5xl font-serif text-[#321327]">Community Reviews</h1>
        <p className="text-xs md:text-sm text-[#321327]/60 leading-relaxed">
          Real feedback from real women. We use your reviews to constantly improve our fit and fabrics.
        </p>
      </div>

      {/* Stats Section */}
      <div className="flex flex-col justify-center space-y-4">
        <div className="flex items-center justify-center lg:justify-start gap-4">
          <span className="text-4xl md:text-5xl font-bold text-[#321327]">{averageRating.toFixed(1)}</span>
          <div className="flex flex-col">
            <div className="flex text-[#840d5c]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill={i < Math.round(averageRating) ? "currentColor" : "none"} strokeWidth={1.2} />
              ))}
            </div>
            <span className="text-[10px] font-bold text-[#321327]/40 uppercase tracking-widest mt-1">
              {totalReviewCount} Reviews
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((num) => (
            <div key={num} className="flex items-center gap-3 text-[10px] font-bold text-[#321327]/60">
              <span className="w-2">{num}</span>
              <Star size={10} fill="currentColor" />
              <div className="grow h-1.5 bg-[#FAF3F5] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#840d5c]" 
                  style={{ width: `${totalReviewCount > 0 ? (ratingCounts[num] / totalReviewCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col justify-center gap-3 md:gap-4">
        <button 
          className="w-full py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-xl shadow-[#840d5c]/20 active:scale-95 lg:hover:scale-105 transition-transform"
          onClick={handleOpenCreate}
        >
          {userId ? 'Write A Review' : 'Login To Review'}
        </button>

      </div>
    </div>

    {/* Horizontal Filter Bar */}
    <div className="flex items-center gap-2 md:gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
      <div className="shrink-0">
        <Filter size={16} className="text-[#840d5c]" />
      </div>
      {['All', '5 Star', '4 Star','3 Star', '2 Star', '1 Star'].map((filter) => (
        <button
          key={filter}
          onClick={() => setActiveFilter(filter)}
          className={`px-4 md:px-5 py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
            activeFilter === filter 
            ? 'bg-[#321327] text-white border-[#321327]' 
            : 'bg-white text-[#321327]/60 border-[#840d5c]/10 hover:border-[#840d5c]/30'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>

    {/* Review Cards List (Amazon-style) */}
    {reviews.length === 0 ? (
      <div className="bg-white border border-[#840d5c]/10 rounded-2xl md:rounded-3xl py-12 text-center">
        <p className="text-sm md:text-base font-semibold text-[#321327]/70">No reviews found</p>
      </div>
    ) : (
      <div className="bg-white rounded-2xl md:rounded-3xl border border-[#840d5c]/5 overflow-hidden">
        {reviews.map((review, index) => (
          <div key={review.id} className={`px-6 md:px-8 py-6 md:py-8 ${index !== reviews.length - 1 ? 'border-b border-[#840d5c]/5' : ''}`}>
            {/* Header: Rating, Name, Date */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
              <div className="flex items-start gap-3 flex-wrap">
                {/* Rating Stars */}
                <div className="flex text-[#840d5c]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} strokeWidth={1.5} />
                  ))}
                </div>

                {/* Title */}
                {review.title && (
                  <h4 className="text-sm md:text-base font-bold text-[#321327] leading-tight w-full sm:w-auto">
                    {review.title}
                  </h4>
                )}
              </div>

              <span className="text-[10px] md:text-[11px] font-medium text-[#840d5c]/40 whitespace-nowrap">
                {new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Reviewer Info */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs md:text-sm font-semibold text-[#321327]">
                By {getReviewerName(review)}
              </span>
              {review.isVerified && (
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold uppercase tracking-tight flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle2 size={11} /> Verified Purchase
                </span>
              )}
            </div>

            {/* Review Text */}
            <p className="text-xs md:text-sm leading-relaxed text-[#522d42]/85 mb-5">
              {review.comment}
            </p>

            {/* Media Gallery (if any) */}
            {Array.isArray(review.images) && review.images.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-[#321327]/60 mb-3">Customer Images</p>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {review.images.map((media) => (
                    <div
                      key={media.id}
                      className="relative shrink-0 h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-lg border border-[#840d5c]/10 bg-[#f8edf2] hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        const mappedMediaItems = review.images
                          .map((item) => {
                            const safeUrl = sanitizeMediaUrl(item.url);
                            if (!safeUrl) return null;
                            const video = isVideoUrl(item.url);
                            return {
                              id: item.id,
                              url: safeUrl,
                              type: video ? 'video' as const : 'image' as const,
                              poster: video ? (toCloudinaryVideoPoster(item.url) || undefined) : undefined,
                            };
                          })
                          .filter(Boolean) as Array<{ id: string; url: string; type: 'image' | 'video'; poster?: string }>;

                        if (!mappedMediaItems.length) return;

                        const selectedIndex = mappedMediaItems.findIndex((item) => item.id === media.id);
                        setPreviewMediaItems(mappedMediaItems);
                        setPreviewMediaIndex(selectedIndex >= 0 ? selectedIndex : 0);
                      }}
                    >
                      {isVideoUrl(media.url) ? (
                        <video
                          src={sanitizeMediaUrl(media.url)}
                          poster={toCloudinaryVideoPoster(media.url) || undefined}
                          className="h-full w-full object-cover"
                          preload="none"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={sanitizeMediaUrl(media.url)}
                          alt="Review media"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {isVideoUrl(media.url) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="text-white text-xl">▶</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {review.userId === userId && (
              <div className="flex gap-2 justify-end">
                <button 
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#840d5c]/10 rounded-lg text-[10px] font-bold uppercase tracking-tight text-[#840d5c] hover:bg-[#840d5c]/15 transition-colors"
                  onClick={() => handleOpenEdit(review)}
                >
                  <Edit size={13} /> Edit
                </button>
                <button 
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 rounded-lg text-[10px] font-bold uppercase tracking-tight text-red-600 hover:bg-red-100 transition-colors"
                  onClick={() => handleDelete(review.id)}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
</div>
  );

  if (!isStandalonePage) {
    return content;
  }

  return (
    <div className="bg-[#FAF3F5] min-h-screen flex flex-col">
      <Header />
      <div className="grow pt-24 md:pt-28 px-4 md:px-8 pb-10">{content}</div>
      <Footer />
    </div>
  );
};

export default ReviewsPage;