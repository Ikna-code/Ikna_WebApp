import { db } from '@/backend/lib/db';
import { NextResponse } from 'next/server';

// Use any-cast to work around stale Prisma TS types; actual isActive/isDeleted columns exist in DB.
const dbProductAny = (db as any).product;

export async function GET() {
  try {
    const products = await dbProductAny.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      include: {
        productType: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
        images: {
          select: {
            id: true,
            image_path: true,
            is_primary: true,
          },
        },
        filters: {
          include: {
            filterOption: {
              include: {
                filterGroup: {
                  select: {
                    id: true,
                    name: true,
                    displayName: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
