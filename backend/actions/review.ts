"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  userId: string,
  data: {
    productId: string;
    rating: number;
    title?: string;
    comment: string;
    fitExperience?: string;
    isVerified?: boolean;
  }
) {
  try {
    return await prisma.review.create({
      data: {
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        isVerified: data.isVerified || false,
        fitExperience: data.fitExperience,
        userId: userId,
        productId: data.productId,
      },
    });
  } catch (error) {
    console.error("Error creating review:", error);
    // Return the actual error message or code for better debugging
    throw new Error(`Could not create review: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
}

// 3. Update an existing review (Protected)
export async function updateReview(
  reviewId: string,
  userId: string,
  data: {
    rating?: number;
    title?: string;
    comment?: string;
    fitExperience?: string;
  }
) {
  try {
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview || existingReview.userId !== userId) {
      throw new Error("Unauthorized: You cannot edit other users' reviews.");
    }

    return await prisma.review.update({
      where: { id: reviewId },
      data,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    throw new Error("Could not update review.");
  }
}

// 4. Delete an existing review (Protected)
export async function deleteReview(reviewId: string, userId: string) {
  try {
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview || existingReview.userId !== userId) {
      throw new Error("Unauthorized: You cannot delete other users' reviews.");
    }

    return await prisma.review.delete({
      where: { id: reviewId },
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    throw new Error("Could not delete review.");
  }
}