"use server";

import { PrismaClient } from "@prisma/client";
import { createServerSupabaseClient } from "@/backend/lib/supabaseServer";

const prisma = new PrismaClient();

async function requireAuthenticatedUserId() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

// 1. Fetch reviews for a product
export async function getReviews(productId: string, ratingFilter?: number) {
  try {
    return await prisma.review.findMany({
      where: {
        productId,
        ...(ratingFilter && ratingFilter > 0 ? { rating: ratingFilter } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        images: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw new Error("Could not fetch reviews.");
  }
}

// 2. Create a new review
export async function createReview(
  _userId: string,
  data: {
    productId: string;
    rating: number;
    title?: string;
    comment: string;
    isVerified?: boolean;
    authorName?: string;
  }
) {
  try {
    const authenticatedUserId = await requireAuthenticatedUserId();

    const normalizedAuthorName = String(data.authorName || '').trim();
    if (normalizedAuthorName) {
      const [firstName, ...lastParts] = normalizedAuthorName.split(/\s+/);
      const lastName = lastParts.join(' ').trim();

      await prisma.user.update({
        where: { id: authenticatedUserId },
        data: {
          firstName: firstName || null,
          lastName: lastName || null,
        },
      });
    }

    return await prisma.review.create({
      data: {
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        isVerified: data.isVerified || false,
        userId: authenticatedUserId,
        productId: data.productId,
      },
    });
  } catch (error) {
    console.error("Error creating review:", error);
    throw new Error(error instanceof Error ? error.message : "Could not create review.");
  }
}

// 3. Update an existing review (Protected)
export async function updateReview(
  reviewId: string,
  _userId: string,
  data: {
    rating?: number;
    title?: string;
    comment?: string;
    authorName?: string;
  }
) {
  try {
    const authenticatedUserId = await requireAuthenticatedUserId();

    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview || existingReview.userId !== authenticatedUserId) {
      throw new Error("Unauthorized: You cannot edit other users' reviews.");
    }

    const normalizedAuthorName = String(data.authorName || '').trim();
    if (normalizedAuthorName) {
      const [firstName, ...lastParts] = normalizedAuthorName.split(/\s+/);
      const lastName = lastParts.join(' ').trim();

      await prisma.user.update({
        where: { id: authenticatedUserId },
        data: {
          firstName: firstName || null,
          lastName: lastName || null,
        },
      });
    }

    return await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: data.rating,
        title: data.title,
        comment: data.comment,
      },
    });
  } catch (error) {
    console.error("Error updating review:", error);
    throw new Error(error instanceof Error ? error.message : "Could not update review.");
  }
}

// 4. Delete an existing review (Protected)
export async function deleteReview(reviewId: string, _userId: string) {
  try {
    const authenticatedUserId = await requireAuthenticatedUserId();

    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview || existingReview.userId !== authenticatedUserId) {
      throw new Error("Unauthorized: You cannot delete other users' reviews.");
    }

    return await prisma.review.delete({
      where: { id: reviewId },
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    throw new Error(error instanceof Error ? error.message : "Could not delete review.");
  }
}

// Fetch top reviews for home page cards with summary stats
export async function getFeaturedReviews(limit = 3) {
  try {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 12)) : 3;

    const [reviews, stats] = await Promise.all([
      prisma.review.findMany({
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [
          { rating: "desc" },
          { helpful: "desc" },
          { createdAt: "desc" },
        ],
        take: safeLimit,
      }),
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const average = Number(stats._avg.rating || 0);

    return {
      reviews,
      averageRating: Number(average.toFixed(1)),
      totalReviews: Number(stats._count.id || 0),
    };
  } catch (error) {
    console.error("Error fetching featured reviews:", error);
    throw new Error("Could not fetch featured reviews.");
  }
}