import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

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

function getIssueLabel(review: {
  rating: number;
  title: string | null;
  comment: string;
  fitExperience: string | null;
}) {
  const text = `${review.title ?? ''} ${review.comment} ${review.fitExperience ?? ''}`.toLowerCase();
  const hasKeyword = seriousKeywords.some((keyword) => text.includes(keyword));

  if (review.rating <= 2 || hasKeyword) return 'Needs attention';
  if (review.rating === 3) return 'Watch list';
  return 'Positive';
}

async function requireAdmin() {
  const dbUser = await ensureCurrentDbUser();

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    return null;
  }

  return dbUser.id;
}

export async function GET() {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const summary = {
    totalReviews: reviews.length,
    needsAttention: reviews.filter((review) => getIssueLabel(review) === 'Needs attention').length,
    watchList: reviews.filter((review) => getIssueLabel(review) === 'Watch list').length,
    averageRating:
      reviews.length > 0
        ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
        : 0,
  };

  return NextResponse.json({
    summary,
    reviews: reviews.slice(0, 6),
  });
}
