"use client";

import dynamic from 'next/dynamic';

const ReviewsPage = dynamic(() => import('@/app/reviews/page'), { ssr: false });

export default function ReviewSectionClient({
  productId,
  openComposerSignal = 0,
  onSummaryChange,
}: {
  productId?: string;
  openComposerSignal?: number;
  onSummaryChange?: (summary: { totalReviews: number; averageRating: number }) => void;
}) {
  return (
    <ReviewsPage
      productId={productId || ''}
      openComposerSignal={openComposerSignal}
      onSummaryChange={onSummaryChange}
    />
  );
}
