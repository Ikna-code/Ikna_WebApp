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
  }
) {
  try {
    const authenticatedUserId = await requireAuthenticatedUserId();

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

    return await prisma.review.update({
      where: { id: reviewId },
      data,
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