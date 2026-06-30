import { db } from '@/backend/lib/db';
import { NextResponse } from 'next/server';
import { serializeDecimal } from '@/backend/lib/serializeDecimal';

// Use any-cast to work around stale Prisma TS types; actual isActive/isDeleted columns exist in DB.
const dbProductAny = (db as any).product;

const getBackendBadgeLabels = (product: any) => {
  const signals = [
    product?.name,
    product?.productType?.name,
    product?.subCategory?.name,
    product?.subCategoryName,
    product?.category,
    product?.category_name,
  ]
    .map((value) => String(value || '').trim().toUpperCase())
    .filter(Boolean)
    .join(' | ');

  const badges: string[] = [];

  if (signals.includes('BARELY THERE')) {
    badges.push('New Arrival');
  }

  if (signals.includes('MINIMIZER') || signals.includes('EVERYDAY WEAR')) {
    badges.push('Best Seller');
  }

  return badges;
};

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

    const inventoryRows = productIds.length
      ? await (db as any)
          .$queryRawUnsafe(
            `SELECT id,
                    product_id AS "productId",
                    size,
                    stock,
                    reserved_stock AS "reservedStock",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
             FROM public.product_inventory
             WHERE product_id IN (${productIds
               .map((_: string, index: number) => `$${index + 1}`)
               .join(',')})
             ORDER BY size ASC`,
            ...productIds
          )
          .catch(() => [])
      : [];

    const inventoryByProductId = new Map<string, any[]>();
    for (const row of Array.isArray(inventoryRows) ? inventoryRows : []) {
      const key = String((row as any)?.productId || '');
      if (!key) continue;

      const list = inventoryByProductId.get(key) || [];
      list.push(row);
      inventoryByProductId.set(key, list);
    }

    const normalizedProducts = products.map((product: any) => ({
      ...product,
      fabricType: String(product.fabricType || 'cotton'),
      inventory: inventoryByProductId.get(String(product.id)) || [],
      backendBadgeLabels: getBackendBadgeLabels(product),
    }));

    // Serialize Decimal values to numbers for JSON response
    const serializedProducts = serializeDecimal(normalizedProducts);

    return NextResponse.json(serializedProducts);
  } catch (error) {
    console.error('[api/products] failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
