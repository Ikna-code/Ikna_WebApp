// @/backend/actions/user.ts
"use server"

import { db } from "@/backend/lib/db";
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';

/**
 * Fetches the currently authenticated user's profile from Prisma
 */
export async function getUser() {
  const dbUser = await ensureCurrentDbUser();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const fullUser = await db.user.findUnique({
    where: { id: dbUser.id },
    include: {
      orders: {
        where: {
          createdAt: {
            gte: weekAgo,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
      _count: {
        select: { orders: true, wishlistItems: true }
      }
    }
  });

  // 3. Keep the JSON serialization to avoid "Plain Object" errors
  return { ok: true, user: JSON.parse(JSON.stringify(fullUser)) };
}

/**
 * Updates user metadata in Prisma
 */
export async function updateUserProfile(data: { firstName?: string; lastName?: string; phone?: string }) {
  const authUser = await ensureCurrentDbUser();

  try {
    const updatedUser = await db.user.update({
      where: { id: authUser.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });
    
    // Remember to serialize the result before returning to client
    return { success: true, user: JSON.parse(JSON.stringify(updatedUser)) };
  } catch (error) {
    console.error("Update Error:", error);
    return { success: false, error: "Failed to update profile" };
  }
}