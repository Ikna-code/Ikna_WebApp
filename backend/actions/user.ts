// @/backend/actions/user.ts
"use server"

import { db } from "@/backend/lib/db";
// 1. IMPORT the Server version of the client
import { createServerSupabaseClient } from '@/backend/lib/supabaseServer'; 

/**
 * Fetches the currently authenticated user's profile from Prisma
 */
export async function getUser() {
  // 2. AWAIT the server client (since it uses cookies())
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  console.log("Auth User found on server:", authUser?.id);

  if (!authUser) {
    return { ok: false, error: 'Unauthorized' };
  }

  const dbUser = await db.user.findUnique({
    where: { id: authUser.id },
    include: {
      _count: {
        select: { orders: true, wishlistItems: true }
      }
    }
  });

  if (!dbUser) {
    return { ok: false, error: 'User not found in database' };
  }

  // 3. Keep the JSON serialization to avoid "Plain Object" errors
  return { ok: true, user: JSON.parse(JSON.stringify(dbUser)) };
}

/**
 * Updates user metadata in Prisma
 */
export async function updateUserProfile(data: { firstName?: string; lastName?: string; phone?: string }) {
  // 4. Use the server client here too
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return { success: false, error: "Unauthorized" };

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