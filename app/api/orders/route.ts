'use server';
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
      address: true,
      orderItems: true
    }
  });

  const normalizedOrders = orders.map((order) => {
    const relationAddress = order.address
      ? [
          order.address.name,
          order.address.street,
          order.address.city,
          order.address.state,
          order.address.zip,
          order.address.country,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    return {
      ...order,
      address: order.shippingAddress || relationAddress || null,
    };
  });

  return NextResponse.json(normalizedOrders, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}