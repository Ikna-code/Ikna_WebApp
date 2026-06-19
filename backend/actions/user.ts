// @/backend/actions/user.ts
"use server"

import { db } from "@/backend/lib/db";
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { serializeDecimal } from "@/backend/lib/serializeDecimal";
import { createSupabaseAdminClient } from '@/backend/lib/supabaseAdmin';

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

  // Serialize Decimal and other non-serializable types
  return { ok: true, user: serializeDecimal(fullUser) };
}

/**
 * Updates user profile (name, phone)
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
    
    return { success: true, user: serializeDecimal(updatedUser) };
  } catch (error) {
    console.error("Update Error:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export interface CommPrefs {
  commOrderUpdates: boolean;
  commBackInStock: boolean;
  commNewCollections: boolean;
  commPromotions: boolean;
}

const COMM_PREF_KEYS = [
  'commOrderUpdates',
  'commBackInStock',
  'commNewCollections',
  'commPromotions',
] as const;

/**
 * Fetches current user's communication preferences.
 * Uses $queryRaw so it works before and after the Prisma client is
 * regenerated with the new columns — and degrades gracefully to true
 * (opt-in) defaults if the migration hasn't run yet.
 */
export async function getCommPrefs(): Promise<{ ok: boolean; prefs?: CommPrefs; error?: string }> {
  try {
    const authUser = await ensureCurrentDbUser();
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT comm_order_updates, comm_back_in_stock, comm_new_collections, comm_promotions
       FROM "User" WHERE id = $1
       LIMIT 1`,
      authUser.id
    );

    if (!rows.length) return { ok: false, error: 'User not found' };
    const row = rows[0];

    return {
      ok: true,
      prefs: {
        commOrderUpdates: row['comm_order_updates'] !== false,
        commBackInStock: row['comm_back_in_stock'] !== false,
        commNewCollections: row['comm_new_collections'] !== false,
        commPromotions: row['comm_promotions'] !== false,
      },
    };
  } catch (error) {
    // Columns may not exist yet — return safe defaults
    console.warn('getCommPrefs: columns may be missing, returning defaults:', error);
    return {
      ok: true,
      prefs: { commOrderUpdates: true, commBackInStock: true, commNewCollections: true, commPromotions: true },
    };
  }
}

/**
 * Persists communication preference updates for the authenticated user.
 * Uses $executeRawUnsafe so it works immediately after the migration is
 * applied even if the Prisma client has not yet been regenerated.
 */
export async function updateCommPrefs(prefs: CommPrefs): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await ensureCurrentDbUser();
    await db.$executeRawUnsafe(
      `UPDATE "User"
       SET comm_order_updates   = $1,
           comm_back_in_stock   = $2,
           comm_new_collections = $3,
           comm_promotions      = $4
       WHERE id = $5`,
      prefs.commOrderUpdates,
      prefs.commBackInStock,
      prefs.commNewCollections,
      prefs.commPromotions,
      authUser.id
    );
    return { success: true };
  } catch (error) {
    console.error('updateCommPrefs error:', error);
    return { success: false, error: 'Failed to save preferences' };
  }
}

/**
 * Permanently deletes the authenticated user's account and related data.
 *
 * Order matters:
 * 1) Remove auth identity from Supabase Auth to prevent future login.
 * 2) Delete relational commerce/profile data in DB.
 */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const authUser = await ensureCurrentDbUser();
    const userId = authUser.id;

    const admin = createSupabaseAdminClient();
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return { success: false, error: authDeleteError.message || 'Failed to delete auth account' };
    }

    await db.$transaction(async (tx) => {
      const userOrders = await tx.order.findMany({
        where: { userId },
        select: { id: true },
      });
      const orderIds = userOrders.map((order) => order.id);

      if (orderIds.length > 0) {
        await tx.payment.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        await tx.orderComboItem.deleteMany({
          where: {
            orderItem: {
              orderId: { in: orderIds },
            },
          },
        });

        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        await tx.order.deleteMany({
          where: { id: { in: orderIds } },
        });
      }

      await tx.address.deleteMany({ where: { userId } });
      await tx.cartItem.deleteMany({ where: { userId } });
      await tx.wishlistItem.deleteMany({ where: { userId } });
      await tx.review.deleteMany({ where: { userId } });
      await tx.user.deleteMany({ where: { id: userId } });
    });

    return { success: true };
  } catch (error) {
    console.error('deleteAccount error:', error);
    return { success: false, error: 'Failed to delete account' };
  }
}