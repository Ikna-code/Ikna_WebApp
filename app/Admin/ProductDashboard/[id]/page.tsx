import { Prisma } from '@prisma/client';

import { db } from '@/backend/lib/db';

import EditProductPageClient from './page.client';

async function getInitialProduct(id: string) {
  const product = await db.product.findUnique({
    where: { id },
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
    },
  });

  if (!product) {
    return null;
  }

  const fabricRows = await db.$queryRaw<Array<{ id: string; fabricType: string | null }>>`
    SELECT id, "fabricType" AS "fabricType"
    FROM "Product"
    WHERE id = ${id}
  `;

  const filterRows = await db.$queryRaw<Array<{
    id: string;
    productId: string;
    filterOptionId: string;
    optionId: string;
    optionValue: string;
    optionDisplayLabel: string;
    groupId: string;
    groupName: string;
    groupDisplayName: string;
    groupSlug: string;
  }>>`
    SELECT
      pf.id,
      pf."productId" AS "productId",
      pf."filterOptionId" AS "filterOptionId",
      fo.id AS "optionId",
      fo.value AS "optionValue",
      fo."displayLabel" AS "optionDisplayLabel",
      fg.id AS "groupId",
      fg.name AS "groupName",
      fg."displayName" AS "groupDisplayName",
      fg.slug AS "groupSlug"
    FROM "product_filters" pf
    INNER JOIN "filter_options" fo ON fo.id = pf."filterOptionId"
    INNER JOIN "filter_groups" fg ON fg.id = fo."filterGroupId"
    WHERE pf."productId" = ${id}
  `;

  const inventoryRows = await db
    .$queryRaw<Array<{
      id: string;
      productId: string;
      size: string;
      stock: number;
      reservedStock: number;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT
        id,
        product_id AS "productId",
        size,
        stock,
        reserved_stock AS "reservedStock",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM public.product_inventory
      WHERE product_id = ${id}
      ORDER BY size ASC
    `
    .catch(() => []);

  return {
    ...product,
    price: Number(product.price),
    fabricType: String(fabricRows[0]?.fabricType || 'cotton'),
    filters: filterRows.map((row) => ({
      id: row.id,
      filterOptionId: row.filterOptionId,
      filterOption: {
        id: row.optionId,
        value: row.optionValue,
        displayLabel: row.optionDisplayLabel,
        filterGroup: {
          id: row.groupId,
          name: row.groupName,
          displayName: row.groupDisplayName,
          slug: row.groupSlug,
        },
      },
    })),
    inventory: inventoryRows,
  };
}

async function getInitialTaxonomy() {
  const productTypes = await db.productType.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      subcategories: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return productTypes;
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [initialProduct, initialTaxonomy] = await Promise.all([
    getInitialProduct(id),
    getInitialTaxonomy(),
  ]);

  return <EditProductPageClient productId={id} initialProduct={initialProduct} initialTaxonomy={initialTaxonomy} />;
}