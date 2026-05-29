
'use client';
import React, { useEffect, useState } from 'react';
import Header from './Analytics/Header';
import MetricCardsGroup from './Analytics/MetricCardsGroup';
import SalesOverviewChart from './Analytics/SalesOverviewChart';
import SalesByChannelChart from './Analytics/SalesByChannelChart';
import TopSellingProducts from './Analytics/TopSellingProducts';
import SalesTrendChart from './Analytics/SalesTrendChart';
// SalesTrendChart is now UserVisitsChart — re-exported from the same file
import RecentOrders from './Analytics/RecentOrders';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, MessageSquareWarning, Star } from 'lucide-react';

type ReviewSummary = {
  totalReviews: number;
  needsAttention: number;
  watchList: number;
  averageRating: number;
};

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  fitExperience: string | null;
  isVerified: boolean;
  createdAt: string;
  user: { id: string; email: string };
  product: { id: string; name: string; category: string; image: string };
};

export default function Dashboard() {
  const [startDate, setStartDate] = useState(new Date(2026, 4, 4));
  const [endDate, setEndDate] = useState(new Date(2026, 4, 10));
  const [timePeriod, setTimePeriod] = useState('week');
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    totalReviews: 0,
    needsAttention: 0,
    watchList: 0,
    averageRating: 0,
  });
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const response = await fetch('/api/admin/reviews');

        if (!response.ok) {
          throw new Error('Unable to load reviews');
        }

        const data = await response.json();
        setReviewSummary(data.summary);
        setReviewRows(data.reviews);
        setReviewError(null);
      } catch (error) {
        setReviewError('Reviews are not available right now.');
      }
    };

    loadReviews();
  }, []);

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} – ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const handleExportReport = () => {
    const csvContent = [
      ['Sales Analytics Report'],
      ['Period', formatDateRange()],
      ['Time Frame', timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)],
      [''],
      ['Metrics'],
      ['Total Sales', '₹1,28,450'],
      ['Orders', '542'],
      ['Avg. Order Value', '₹2,371'],
      ['Units Sold', '1,248'],
      [''],
      ['Generated on', new Date().toLocaleString()]
    ].map(row => row.join(',')).join('\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `sales_report_${new Date().getTime()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
      <div className="space-y-6 lg:space-y-8">
        <Header 
          startDate={startDate} 
          endDate={endDate} 
          onDateChange={(start: Date, end: Date) => {
            setStartDate(start);
            setEndDate(end);
          }}
          onExport={handleExportReport}
        />
        <MetricCardsGroup timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesOverviewChart timePeriod={timePeriod} />
          </div>
          <div>
            <SalesByChannelChart timePeriod={timePeriod} />
          </div>
        </div>

        {/* Bottom Data Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <TopSellingProducts />
          <SalesTrendChart />
          <RecentOrders />
        </div>

        <section className="rounded-[2rem] border border-[#E9E4E0] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#3D0A21]">
                <MessageSquareWarning className="h-5 w-5" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Customer feedback</p>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#2B1B24]">Reviews & Issues</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-[#7A6B73]">
                See what customers are saying, spot serious issues quickly, and open the full review board when you
                need to investigate.
              </p>
            </div>
            <Link
              href="/Admin/Reviews"
              className="inline-flex items-center justify-center rounded-full bg-[#3D0A21] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white transition hover:bg-[#521330]"
            >
              Open full review board
            </Link>
          </div>

          {reviewError ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#E9E4E0] bg-[#FAF6F4] p-5 text-sm text-[#7A6B73]">
              {reviewError}
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ReviewStatCard icon={Star} label="Average rating" value={reviewSummary.averageRating.toFixed(1)} />
                <ReviewStatCard icon={MessageSquareWarning} label="Total reviews" value={reviewSummary.totalReviews.toString()} />
                <ReviewStatCard icon={AlertTriangle} label="Needs attention" value={reviewSummary.needsAttention.toString()} tone="danger" />
                <ReviewStatCard icon={CheckCircle2} label="Watch list" value={reviewSummary.watchList.toString()} tone="warning" />
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {reviewRows.length > 0 ? (
                  reviewRows.map((review) => (
                    <div key={review.id} className="rounded-[1.5rem] border border-[#E9E4E0] bg-[#FAF6F4] p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#7A6B73]">{review.product.name}</p>
                          <p className="mt-1 text-sm font-semibold text-[#2B1B24]">{review.user.email}</p>
                        </div>
                        <span className="rounded-full bg-[#3D0A21] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
                          {review.rating} star
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-[#2B1B24]">{review.title || 'Untitled review'}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#522d42]/85 line-clamp-3">{review.comment}</p>
                      <p className="mt-3 text-xs text-[#7A6B73]">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E9E4E0] bg-[#FAF6F4] p-5 text-sm text-[#7A6B73] xl:col-span-2">
                    No reviews available yet.
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
  );
}

function ReviewStatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'danger' | 'warning';
}) {
  const toneClasses =
    tone === 'danger'
      ? 'bg-red-50 text-red-700 border-red-100'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-[#FAF6F4] text-[#3D0A21] border-[#E9E4E0]';

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] opacity-80">{label}</p>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}