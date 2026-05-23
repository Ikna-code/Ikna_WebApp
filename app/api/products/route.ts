import { db } from "@/backend/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch directly from your Neon database
    const products = await db.product.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}