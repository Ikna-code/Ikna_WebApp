import { PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { AlertTriangle, CheckCircle2, MessageSquareWarning, Star, Users } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();
const REVIEWS_PER_PAGE = 8;

const seriousKeywords = [
  'broken',
  'defect',
  'defective',
  'issue',
  'problem',
  'poor',
  'wrong size',
  'tight',
  'itchy',
  'uncomfortable',
  'refund',
  'return',
  'damage',
  'damaged',
  'delay',
  'late',
  'stitch',
  'tear',
];

function getStarArray(rating: number) {
  return Array.from({ length: 5 }, (_, index) => index < rating);
}

function getIssueLabel(review: {
  rating: number;
  title: string | null;
  comment: string;
}) {
  const text = `${review.title ?? ''} ${review.comment}`.toLowerCase();
  const hasKeyword = seriousKeywords.some((keyword) => text.includes(keyword));

  if (review.rating <= 2 || hasKeyword) {
    return 'Needs attention';
  }

  if (review.rating === 3) {
    return 'Watch list';
  }

  return 'Positive';
}

function getIssueTone(label: string) {
  if (label === 'Needs attention') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (label === 'Watch list') return 'bg-[#f8eaf2] text-[#840d5c] border-[#e8bfd5]';
  return 'bg-[#edd4e3] text-[#5a073f] border-[#dca9c6]';
}

async function getAdminContext() {
  const dbUser = await ensureCurrentDbUser();

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    return { allowed: false as const, reason: 'This page is restricted to the owner/admin account.' };
  }

  return { allowed: true as const, email: dbUser.email };
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const adminContext = await getAdminContext();

  if (!adminContext.allowed) {
    return (
      <div className="rounded-[2rem] border border-[#e8bfd5] bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-[#840d5c]">
          <MessageSquareWarning className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Reviews & Issues</h1>
        </div>
        <p className="mt-3 text-sm text-[#8a5f79]">{adminContext.reason}</p>
      </div>
    );
  }

  const reviews = await prisma.review.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          image: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const totalReviews = reviews.length;
  const flaggedReviews = reviews.filter((review) => getIssueLabel(review) === 'Needs attention');
  const watchListReviews = reviews.filter((review) => getIssueLabel(review) === 'Watch list');
  const positiveReviews = reviews.filter((review) => getIssueLabel(review) === 'Positive');
  const verifiedReviews = reviews.filter((review) => review.isVerified).length;
  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
      : '0.0';

  const rawFilter = Array.isArray(resolvedSearchParams?.filter)
    ? resolvedSearchParams?.filter[0]
    : resolvedSearchParams?.filter;
  const normalizedFilter = String(rawFilter || 'all').toLowerCase();
  const allowedFilters = new Set(['all', 'needs-attention', 'watch-list', 'positive', 'verified']);
  const activeFilter = allowedFilters.has(normalizedFilter) ? normalizedFilter : 'all';

  const filteredReviews = reviews.filter((review) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'verified') return review.isVerified;
    if (activeFilter === 'needs-attention') return getIssueLabel(review) === 'Needs attention';
    if (activeFilter === 'watch-list') return getIssueLabel(review) === 'Watch list';
    if (activeFilter === 'positive') return getIssueLabel(review) === 'Positive';
    return true;
  });

  const rawPage = Array.isArray(resolvedSearchParams?.page)
    ? resolvedSearchParams?.page[0]
    : resolvedSearchParams?.page;
  const pageNumber = Number(rawPage || 1);
  const currentPage = Number.isFinite(pageNumber) ? Math.max(1, Math.floor(pageNumber)) : 1;
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * REVIEWS_PER_PAGE;
  const paginatedReviews = filteredReviews.slice(startIndex, startIndex + REVIEWS_PER_PAGE);

  const buildHref = (page: number, filter: string) => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    return query ? `/Admin/Reviews?${query}` : '/Admin/Reviews';
  };

  const filterPills = [
    {
      key: 'all',
      label: 'All',
      count: totalReviews,
      activeClass: 'border-slate-700 bg-slate-700 text-white',
      inactiveClass: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
    },
    {
      key: 'needs-attention',
      label: 'Needs attention',
      count: flaggedReviews.length,
      activeClass: 'border-amber-600 bg-amber-600 text-white',
      inactiveClass: 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50',
    },
    {
      key: 'watch-list',
      label: 'Watch list',
      count: watchListReviews.length,
      activeClass: 'border-violet-600 bg-violet-600 text-white',
      inactiveClass: 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50',
    },
    {
      key: 'positive',
      label: 'Positive',
      count: positiveReviews.length,
      activeClass: 'border-emerald-600 bg-emerald-600 text-white',
      inactiveClass: 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
    },
    {
      key: 'verified',
      label: 'Verified',
      count: verifiedReviews,
      activeClass: 'border-sky-600 bg-sky-600 text-white',
      inactiveClass: 'border-sky-200 bg-white text-sky-700 hover:bg-sky-50',
    },
  ];

  const mobileFilterCards: Array<{
    key: string;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    activeClass: string;
    inactiveClass: string;
    iconShellClass: string;
    badgeClass: string;
  }> = [
    {
      key: 'all',
      label: 'All',
      count: totalReviews,
      icon: Users,
      activeClass: 'border-slate-500 bg-slate-100',
      inactiveClass: 'border-neutral-200 bg-white hover:border-slate-300',
      iconShellClass: 'bg-slate-100 text-slate-700 border-slate-200',
      badgeClass: 'bg-slate-700 text-white',
    },
    {
      key: 'needs-attention',
      label: 'Needs attention',
      count: flaggedReviews.length,
      icon: AlertTriangle,
      activeClass: 'border-amber-500 bg-amber-50',
      inactiveClass: 'border-neutral-200 bg-white hover:border-amber-300',
      iconShellClass: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeClass: 'bg-amber-600 text-white',
    },
    {
      key: 'watch-list',
      label: 'Watch list',
      count: watchListReviews.length,
      icon: MessageSquareWarning,
      activeClass: 'border-violet-500 bg-violet-50',
      inactiveClass: 'border-neutral-200 bg-white hover:border-violet-300',
      iconShellClass: 'bg-violet-50 text-violet-700 border-violet-200',
      badgeClass: 'bg-violet-600 text-white',
    },
    {
      key: 'positive',
      label: 'Positive',
      count: positiveReviews.length,
      icon: Star,
      activeClass: 'border-emerald-500 bg-emerald-50',
      inactiveClass: 'border-neutral-200 bg-white hover:border-emerald-300',
      iconShellClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeClass: 'bg-emerald-600 text-white',
    },
    {
      key: 'verified',
      label: 'Verified',
      count: verifiedReviews,
      icon: CheckCircle2,
      activeClass: 'border-sky-500 bg-sky-50',
      inactiveClass: 'border-neutral-200 bg-white hover:border-sky-300',
      iconShellClass: 'bg-sky-50 text-sky-700 border-sky-200',
      badgeClass: 'bg-sky-600 text-white',
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[2rem] border border-[#e8bfd5] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#840d5c]">
              <MessageSquareWarning className="h-5 w-5" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Owner review board</p>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#2f1126] md:text-4xl">Reviews & Issues</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8a5f79]">
                Every review is collected here for the owner to inspect product feedback, spot serious issues, and
                respond quickly when customers raise concerns.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e8bfd5] bg-[#f8eef4] p-4 text-sm text-[#5c2a46] shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a5f79]">Signed in as</p>
            <p className="mt-1 font-semibold text-[#2f1126]">{adminContext.email}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Total reviews" value={totalReviews.toString()} tone="blueberry" />
          <StatCard icon={Star} label="Average rating" value={averageRating} />
          <StatCard icon={AlertTriangle} label="Needs attention" value={flaggedReviews.length.toString()} tone="danger" />
          <StatCard icon={CheckCircle2} label="Verified reviews" value={verifiedReviews.toString()} tone="success" />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#2f1126]">Priority issues</h2>
            <p className="text-xs text-[#8a5f79]">Low ratings or keyword matches that need owner attention first.</p>
          </div>
          <span className="rounded-full bg-[#840d5c] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
            {flaggedReviews.length} flagged
          </span>
        </div>

        {flaggedReviews.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {flaggedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} highlighted />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e8bfd5] bg-white p-6 text-sm text-[#8a5f79]">
            No serious issues found yet.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#2f1126]">All reviews</h2>
            <p className="text-xs text-[#8a5f79]">Newest feedback appears first. Use filters to narrow the review feed.</p>
          </div>
          <span className="rounded-full border border-[#e8bfd5] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a5f79]">
            Page {safeCurrentPage} of {totalPages}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 md:hidden">
          {mobileFilterCards.map((filter) => {
            const isActive = activeFilter === filter.key;
            const Icon = filter.icon;

            return (
              <Link
                key={filter.key}
                href={buildHref(1, filter.key)}
                className={`rounded-2xl border p-2 text-center shadow-sm transition ${
                  isActive
                    ? filter.activeClass
                    : filter.inactiveClass
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className={`relative rounded-lg border p-1 ${filter.iconShellClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className={`absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${filter.badgeClass}`}>
                      {filter.count}
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {filterPills.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <Link
                key={filter.key}
                href={buildHref(1, filter.key)}
                className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] transition-colors ${
                  isActive
                    ? filter.activeClass
                    : filter.inactiveClass
                }`}
              >
                {filter.label} ({filter.count})
              </Link>
            );
          })}
        </div>

        {paginatedReviews.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {paginatedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e8bfd5] bg-white p-6 text-sm text-[#8a5f79]">
            No reviews found for this filter.
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Link
              href={buildHref(Math.max(1, safeCurrentPage - 1), activeFilter)}
              aria-disabled={safeCurrentPage === 1}
              className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                safeCurrentPage === 1
                  ? 'pointer-events-none border-[#f0dbe6] text-[#cfacc2]'
                  : 'border-[#e8bfd5] text-[#8a5f79] hover:bg-[#f8eef4]'
              }`}
            >
              Prev
            </Link>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => {
              const isActive = page === safeCurrentPage;
              return (
                <Link
                  key={page}
                  href={buildHref(page, activeFilter)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                    isActive
                      ? 'border-[#2f1126] bg-[#2f1126] text-white'
                      : 'border-[#e8bfd5] text-[#8a5f79] hover:bg-[#f8eef4]'
                  }`}
                >
                  {page}
                </Link>
              );
            })}

            <Link
              href={buildHref(Math.min(totalPages, safeCurrentPage + 1), activeFilter)}
              aria-disabled={safeCurrentPage === totalPages}
              className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                safeCurrentPage === totalPages
                  ? 'pointer-events-none border-[#f0dbe6] text-[#cfacc2]'
                  : 'border-[#e8bfd5] text-[#8a5f79] hover:bg-[#f8eef4]'
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'danger' | 'success' | 'blueberry';
}) {
  const toneClasses =
    tone === 'danger'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : tone === 'blueberry'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
      : tone === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-[#f8eef4] text-[#840d5c] border-[#e8bfd5]';

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

function ReviewCard({
  review,
  highlighted = false,
}: {
  review: {
    id: string;
    rating: number;
    title: string | null;
    comment: string;
    fitExperience: string | null;
    isVerified: boolean;
    createdAt: Date;
    helpful: number;
    user: { id: string; email: string };
    product: { id: string; name: string; category: string | null; image: string };
    images: { id: string; url: string }[];
  };
  highlighted?: boolean;
}) {
  const issueLabel = getIssueLabel(review);
  const issueTone = getIssueTone(issueLabel);

  return (
    <article className={`rounded-[1.75rem] border bg-white p-5 shadow-sm md:p-6 ${highlighted ? 'border-[#dca9c6] ring-1 ring-[#e8bfd5]' : 'border-[#e8bfd5]'}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${issueTone}`}>
              {issueLabel}
            </span>
            {review.isVerified && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-700">
                Verified
              </span>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a5f79]">Customer</p>
            <p className="text-sm font-semibold text-[#2f1126]">{review.user.email}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a5f79]">Product</p>
            <p className="text-sm font-semibold text-[#2f1126]">{review.product.name}</p>
            <p className="text-xs text-[#8a5f79]">{review.product.category || 'Uncategorized'}</p>
          </div>
        </div>

        <div className="text-left md:text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a5f79]">Rating</p>
          <div className="mt-1 flex items-center gap-1 md:justify-end text-[#840d5c]">
            {getStarArray(review.rating).map((filled, index) => (
              <Star key={index} size={14} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.6} />
            ))}
          </div>
          <p className="mt-2 text-xs text-[#8a5f79]">
            {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {review.title && <h3 className="text-base font-bold text-[#2f1126]">{review.title}</h3>}
        <p className="text-sm leading-relaxed text-[#522d42]/85">{review.comment}</p>
        {review.fitExperience && (
          <p className="text-xs italic text-[#8a5f79]">Fit experience: {review.fitExperience}</p>
        )}
      </div>

      {/* <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a5f79]">
        <span className="rounded-full bg-[#f8eef4] px-2.5 py-1">{review.images.length} image{review.images.length === 1 ? '' : 's'}</span>
      </div> */}
    </article>
  );
}
