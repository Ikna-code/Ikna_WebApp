import { db } from '@/backend/lib/db';
import { NextResponse } from 'next/server';
import { serializeDecimal } from '@/backend/lib/serializeDecimal';

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

    const productIds = products.map((product: any) => String(product.id));
    const fabricRows = productIds.length
      ? await (db as any).$queryRawUnsafe(
          `SELECT id, "fabricType" AS "fabricType" FROM "Product" WHERE id IN (${productIds
            .map((_: string, index: number) => `$${index + 1}`)
            .join(',')})`,
          ...productIds
        )
      : [];

    const fabricById = new Map(
      (Array.isArray(fabricRows) ? fabricRows : []).map((row: any) => [String(row.id), String(row.fabricType || 'cotton')])
    );

    const normalizedProducts = products.map((product: any) => ({
      ...product,
      fabricType: fabricById.get(String(product.id)) || 'cotton',
    }));

    // Serialize Decimal values to numbers for JSON response
    const serializedProducts = serializeDecimal(normalizedProducts);

    return NextResponse.json(serializedProducts);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
