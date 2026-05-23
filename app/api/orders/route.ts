'use server';
import { createServerSupabaseClient } from "@/backend/lib/supabaseServer";
import { NextResponse } from "next/server";
import { db } from "@/backend/lib/db";
// cookies() is automatically resolved in Next.js, no need to pass it to the function
import { cookies } from "next/headers"; 

export async function GET(request: Request) {
  // Ensure cookies is awaited if using Next.js 15+
  const cookieStore = await cookies();
  
  // Call createClient without arguments
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log("Authenticated user:", user);
  
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      orderItems: {
        include: {
          product: true,
        }
      }
    }
  });
  
  return NextResponse.json(orders);
}