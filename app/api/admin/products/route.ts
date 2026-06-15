import { NextRequest, NextResponse } from 'next/server';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { extractCloudinaryPublicId } from '@/src/lib/cloudinary';
import { syncProductInventory } from '@/backend/services/inventory';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();
const prismaAny = prisma as any;

const createImageId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const createProductFilterId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const isNumericProductId = (value: string) => /^\d+$/.test(String(value || '').trim());

const normalizeNumericProductId = (value: string) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '';
};

const isDuplicateProductIdError = (error: any) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code === '23505' ||
    code === 'P2002' ||
    /Product.*id|Product_pkey|duplicate key|Unique constraint failed/i.test(message)
  );
};

function toStoragePath(pathOrUrl: string) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    const markers = [
      '/storage/v1/object/public/products/',
      '/storage/v1/object/products/',
    ];

    for (const marker of markers) {
      const markerIndex = value.indexOf(marker);
      if (markerIndex >= 0) {
        return value.slice(markerIndex + marker.length);
      }
    }
  }

  return value.replace(/^\/+/, '');
}

function toImageKey(pathOrUrl: string) {
  const cloudinaryPublicId = extractCloudinaryPublicId(pathOrUrl);
  if (cloudinaryPublicId) return `cld:${cloudinaryPublicId}`;
  return `supa:${toStoragePath(pathOrUrl)}`;
}

const slugify = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const GLOBAL_BADGE_ID_PREFIX = 'global-product-badge-';
const GLOBAL_BADGE_LABEL_BY_SLUG: Record<string, string> = {
  'few-left': 'Few Left',
  'new-arrival': 'New Arrival',
  'limited-stock': 'Limited Stock',
};

function parseGlobalBadgeId(candidateId: string) {
  const value = String(candidateId || '').trim();
  if (!value.startsWith(GLOBAL_BADGE_ID_PREFIX)) {
    return null;
  }

  const slug = value.slice(GLOBAL_BADGE_ID_PREFIX.length).trim();
  if (!slug) {
    return null;
  }

  const displayLabel = GLOBAL_BADGE_LABEL_BY_SLUG[slug];
  if (!displayLabel) {
    return null;
  }

  return {
    slug,
    displayLabel,
  };
}

async function resolveProductTypeId(body: any) {
  try {
    const explicitId = typeof body?.productTypeId === 'string' ? body.productTypeId.trim() : '';
    if (explicitId) {
      const byId = await prismaAny.productType.findUnique({ where: { id: explicitId } });
      if (byId?.id) return byId.id;
    }

    const explicitSlug = typeof body?.productTypeSlug === 'string' ? body.productTypeSlug.trim() : '';
    if (explicitSlug) {
      const bySlug = await prismaAny.productType.findUnique({ where: { slug: explicitSlug } });
      if (bySlug?.id) return bySlug.id;
    }

    const baseName = typeof body?.productTypeName === 'string' && body.productTypeName.trim()
      ? body.productTypeName.trim()
      : typeof body?.category === 'string' && body.category.trim()
        ? body.category.trim()
        : 'General';

    const baseSlug = slugify(baseName) || 'general';
    const existing = await prismaAny.productType.findUnique({ where: { slug: baseSlug } });
    if (existing?.id) return existing.id;

    const created = await prismaAny.productType.create({
      data: {
        name: baseName,
        slug: baseSlug,
        isActive: true,
      },
      select: { id: true },
    });

    return created.id;
  } catch {
    // Fallback path for environments where generated Prisma typings lag schema changes.
    try {
      const explicitId = typeof body?.productTypeId === 'string' ? body.productTypeId.trim() : '';
      if (explicitId) {
        const byId = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "product_types" WHERE id = ${explicitId} LIMIT 1
        `;
        if (byId[0]?.id) return byId[0].id;
      }

      const explicitSlug = typeof body?.productTypeSlug === 'string' ? body.productTypeSlug.trim() : '';
      if (explicitSlug) {
        const bySlug = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "product_types" WHERE slug = ${explicitSlug} LIMIT 1
        `;
        if (bySlug[0]?.id) return bySlug[0].id;
      }

      const baseName = typeof body?.productTypeName === 'string' && body.productTypeName.trim()
        ? body.productTypeName.trim()
        : typeof body?.category === 'string' && body.category.trim()
          ? body.category.trim()
          : 'General';
      const baseSlug = slugify(baseName) || 'general';

      const existing = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "product_types" WHERE slug = ${baseSlug} LIMIT 1
      `;
      if (existing[0]?.id) return existing[0].id;

      const created = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "product_types" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${baseName}, ${baseSlug}, true, NOW(), NOW())
        RETURNING id
      `;

      return created[0]?.id || '';
    } catch {
      return '';
    }
  }
}

async function resolveSubCategoryId(body: any, productTypeId: string) {
  if (!productTypeId) return '';

  try {
    const explicitId = typeof body?.subCategoryId === 'string' ? body.subCategoryId.trim() : '';
    if (explicitId) {
      const byId = await prismaAny.subCategory.findUnique({ where: { id: explicitId } });
      if (byId?.id && String(byId.productTypeId) === String(productTypeId)) {
        return byId.id;
      }
    }

    const explicitSlug = typeof body?.subCategorySlug === 'string' ? body.subCategorySlug.trim() : '';
    if (explicitSlug) {
      const bySlug = await prismaAny.subCategory.findFirst({
        where: {
          productTypeId,
          slug: explicitSlug,
        },
      });
      if (bySlug?.id) return bySlug.id;
    }

    const explicitName = typeof body?.subCategoryName === 'string'
      ? body.subCategoryName.trim()
      : typeof body?.subCategory === 'string'
        ? body.subCategory.trim()
        : '';

    if (!explicitName) {
      return '';
    }

    const byName = await prismaAny.subCategory.findFirst({
      where: {
        productTypeId,
        name: explicitName,
      },
    });
    if (byName?.id) return byName.id;

    const normalizedSlug = slugify(explicitName);
    if (!normalizedSlug) {
      return '';
    }

    const byNormalizedSlug = await prismaAny.subCategory.findFirst({
      where: {
        productTypeId,
        slug: normalizedSlug,
      },
    });
    return byNormalizedSlug?.id || '';
  } catch {
    return '';
  }
}

async function getNextSequentialProductId() {
  const products = await prisma.product.findMany({
    select: { id: true },
  });

  let maxId = 0;

  for (const product of products) {
    const currentId = String(product?.id || '').trim();
    if (!isNumericProductId(currentId)) {
      continue;
    }

    const numericId = Number.parseInt(currentId, 10);
    if (Number.isFinite(numericId)) {
      maxId = Math.max(maxId, numericId);
    }
  }

  return String(maxId + 1);
}

async function requireAdmin() {
  try {
    const dbUser = await ensureCurrentDbUser();

    if (!dbUser || dbUser.role !== Role.ADMIN) {
      return null;
    }

    return dbUser.id;
  } catch {
    return null;
  }
}

async function syncProductFilters(
  productId: string,
  filterOptionIdsRaw: unknown,
  productTypeId: string
) {
  if (!Array.isArray(filterOptionIdsRaw)) {
    return;
  }

  const candidateIds = Array.from(
    new Set(
      filterOptionIdsRaw
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );

  if (candidateIds.length === 0) {
    await prisma.$executeRaw`
      DELETE FROM "product_filters"
      WHERE "productId" = ${productId}
    `;
    return;
  }

  const globalBadgeCandidates = candidateIds
    .map(parseGlobalBadgeId)
    .filter((item): item is { slug: string; displayLabel: string } => Boolean(item));
  const dbCandidateIds = candidateIds.filter((id) => !parseGlobalBadgeId(id));

  const candidateOptions = dbCandidateIds.length
    ? await prisma.$queryRaw<Array<{ id: string; productTypeId: string }>>`
    SELECT fo.id, fg."productTypeId" AS "productTypeId"
    FROM "filter_options" fo
    INNER JOIN "filter_groups" fg ON fg.id = fo."filterGroupId"
    WHERE fo."isActive" = true
      AND fg."isActive" = true
      AND fo.id IN (${Prisma.join(dbCandidateIds)})
  `
    : [];

  if (globalBadgeCandidates.length > 0 && productTypeId) {
    const badgeGroup = await prismaAny.filterGroup.upsert({
      where: {
        productTypeId_slug: {
          productTypeId,
          slug: 'tags',
        },
      },
      update: {
        name: 'Product Badges',
        displayName: 'Product Badges',
        isActive: true,
        filterType: 'MULTI_SELECT',
      },
      create: {
        productTypeId,
        name: 'Product Badges',
        displayName: 'Product Badges',
        slug: 'tags',
        displayOrder: 999,
        isActive: true,
        filterType: 'MULTI_SELECT',
      },
      select: { id: true },
    });

    for (const badge of globalBadgeCandidates) {
      const existingOption = await prismaAny.filterOption.findFirst({
        where: {
          filterGroupId: badgeGroup.id,
          value: badge.slug,
        },
        select: { id: true },
      });

      const optionId = existingOption?.id
        ? existingOption.id
        : (
            await prismaAny.filterOption.create({
              data: {
                filterGroupId: badgeGroup.id,
                value: badge.slug,
                displayLabel: badge.displayLabel,
                isActive: true,
              },
              select: { id: true },
            })
          ).id;

      candidateOptions.push({
        id: String(optionId),
        productTypeId: String(productTypeId),
      });
    }
  }

  const allowedByType = productTypeId
    ? candidateOptions
        .filter((option) => String(option.productTypeId) === String(productTypeId))
        .map((option) => String(option.id))
    : [];

  const fallbackAllowed = candidateOptions.map((option) => String(option.id));
  const sourceIds = allowedByType.length > 0 ? allowedByType : fallbackAllowed;
  const allowedIds = new Set(sourceIds);
  const validOptionIds = candidateOptions
    .map((option) => String(option.id))
    .filter((id) => allowedIds.has(id));

  if (validOptionIds.length === 0) {
    return;
  }

  await prisma.$executeRaw`
    DELETE FROM "product_filters"
    WHERE "productId" = ${productId}
  `;

  for (const optionId of validOptionIds) {
    await prisma.$executeRaw`
      INSERT INTO "product_filters" ("id", "productId", "filterOptionId")
      VALUES (${createProductFilterId()}, ${productId}, ${optionId})
      ON CONFLICT ("productId", "filterOptionId") DO NOTHING
    `;
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    const productIds = products.map((product) => String(product.id));
    const fabricRows = productIds.length
      ? await prisma.$queryRaw<Array<{ id: string; fabricType: string | null }>>`
          SELECT id, "fabricType" AS "fabricType"
          FROM "Product"
          WHERE id IN (${Prisma.join(productIds)})
        `
      : [];
    const fabricById = new Map(
      fabricRows.map((row) => [String(row.id), String(row.fabricType || 'cotton')])
    );

    const filterRowsRaw = productIds.length
      ? await prisma.$queryRaw<Array<{
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
        `
      : [];

    const inventoryRows = productIds.length
      ? await prisma
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
          WHERE product_id IN (${Prisma.join(productIds)})
          ORDER BY size ASC
        `
          .catch(() => [])
      : [];

    const productIdSet = new Set(productIds);
    const filterRows = filterRowsRaw.filter((row) => productIdSet.has(String(row.productId)));

    const filtersByProduct = new Map<string, any[]>();
    for (const row of filterRows) {
      const list = filtersByProduct.get(row.productId) || [];
      list.push({
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
      });
      filtersByProduct.set(row.productId, list);
    }

    const inventoryByProduct = new Map<string, any[]>();
    for (const row of inventoryRows) {
      const list = inventoryByProduct.get(String(row.productId)) || [];
      list.push(row);
      inventoryByProduct.set(String(row.productId), list);
    }

    return NextResponse.json(
      products.map((product) => ({
        ...product,
        fabricType: fabricById.get(String(product.id)) || 'cotton',
        filters: filtersByProduct.get(String(product.id)) || [],
        inventory: inventoryByProduct.get(String(product.id)) || [],
      }))
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const productTypeId = await resolveProductTypeId(body);
    const subCategoryId = await resolveSubCategoryId(body, productTypeId);

    if (
      !body?.name ||
      typeof body?.price !== 'number' ||
      typeof body?.stock !== 'number' ||
      typeof body?.description !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const imagePaths: string[] = Array.isArray(body?.imagePaths)
      ? body.imagePaths.filter((item: unknown) => typeof item === 'string' && item.length > 0)
      : [];

    const requestedPrimaryImagePath =
      typeof body?.primaryImagePath === 'string' && body.primaryImagePath.trim().length > 0
        ? body.primaryImagePath.trim()
        : typeof body?.image === 'string' && body.image.trim().length > 0
          ? body.image.trim()
          : '';

    const primaryImagePath =
      requestedPrimaryImagePath ||
      imagePaths[0] ||
      'https://images.unsplash.com/photo-1567016549366-5f3194bab37b?w=400&auto=format&fit=crop';

    const sizes: string[] = Array.isArray(body?.sizes)
      ? body.sizes.filter((item: unknown) => typeof item === 'string' && item.length > 0)
      : [];
    const inventoryPayload: unknown[] = Array.isArray(body?.inventory) ? body.inventory : [];
    const requestedInventory = inventoryPayload.length
      ? inventoryPayload
          .filter(
            (item: unknown): item is { size: string; stock: number } =>
              Boolean(item) && typeof (item as any).size === 'string' && typeof (item as any).stock === 'number'
          )
          .map((item) => ({ size: item.size, stock: item.stock }))
      : null;

    const requestedIdRaw = typeof body?.id === 'string' ? body.id.trim() : '';
    const requestedId = isNumericProductId(requestedIdRaw)
      ? normalizeNumericProductId(requestedIdRaw)
      : '';

    const createPayload: Record<string, any> = {
      name: body.name,
      price: body.price,
      stock: body.stock,
      category: body.category || 'Bras',
      image: primaryImagePath,
      description: body.description,
      tag: body.tag || null,
      rating: typeof body?.rating === 'number' ? body.rating : null,
      sizes,
      isActive: typeof body?.isActive === 'boolean' ? body.isActive : true,
      isDeleted: false,
      deletedAt: null,
      colorHex:
        typeof body?.colorHex === 'string' && body.colorHex.trim().length > 0
          ? body.colorHex.trim()
          : '#000000',
      colorName:
        typeof body?.colorName === 'string' && body.colorName.trim().length > 0
          ? body.colorName.trim()
          : 'Unspecified',
      fabricType:
        typeof body?.fabricType === 'string' && body.fabricType.trim().length > 0
          ? body.fabricType.trim()
          : 'cotton',
    };

    if (productTypeId) {
      createPayload.productTypeId = productTypeId;
    }

    if (subCategoryId) {
      createPayload.subCategoryId = subCategoryId;
    }

    if (!createPayload.productTypeId) {
      return NextResponse.json({ error: 'Unable to resolve product type' }, { status: 500 });
    }

    const maxAttempts = 5;
    let attempt = 0;
    let product: any = null;
    let createError: any = null;

    while (attempt < maxAttempts) {
      const productId =
        attempt === 0 && requestedId ? requestedId : await getNextSequentialProductId();

      try {
        const now = new Date();
        const inserted = await prisma.$queryRaw<Array<Record<string, any>>>`
          INSERT INTO "Product"
            ("id", "name", "price", "description", "image", "category", "stock", "isActive", "isDeleted", "deletedAt", "createdAt", "updatedAt", "tag", "rating", "sizes", "productTypeId", "subCategoryId", "colorHex", "colorName", "fabricType")
          VALUES
            (
              ${productId},
              ${String(createPayload.name)},
              ${createPayload.price},
              ${String(createPayload.description)},
              ${String(createPayload.image)},
              ${String(createPayload.category)},
              ${createPayload.stock},
              ${createPayload.isActive},
              ${createPayload.isDeleted},
              ${createPayload.deletedAt},
              ${now},
              ${now},
              ${createPayload.tag ?? null},
              ${createPayload.rating ?? null},
              ${createPayload.sizes},
              ${String(createPayload.productTypeId)},
              ${createPayload.subCategoryId ?? null},
              ${String(createPayload.colorHex)},
              ${String(createPayload.colorName)},
              ${String(createPayload.fabricType)}
            )
          RETURNING *
        `;

        product = inserted?.[0] || null;
        createError = null;
      } catch (error: any) {
        product = null;
        createError = error;
      }

      if (!createError && product) {
        break;
      }

      if (isDuplicateProductIdError(createError)) {
        attempt += 1;
        continue;
      }

      break;
    }

    if (createError || !product) {
      throw new Error(createError?.message || 'Failed to create product');
    }

    await syncProductInventory(
      String(product.id),
      sizes,
      requestedInventory,
      Number(createPayload.stock || 0),
      prisma,
      'Product creation inventory initialization'
    );

    if (imagePaths.length) {
      try {
        const primaryImageKey = toImageKey(primaryImagePath);
        const hasMatchingPrimary = imagePaths.some((path) => toImageKey(path) === primaryImageKey);

        await prismaAny.productImage.createMany({
          data: imagePaths.map((path: string, index: number) => ({
            id: createImageId(),
            product_id: product.id,
            image_path: path,
            public_id: extractCloudinaryPublicId(path) || null,
            is_primary: hasMatchingPrimary
              ? toImageKey(path) === primaryImageKey
              : index === 0,
          })),
        });
      } catch (imgError: any) {
        // Product was created; log but don't fail the whole request.
        console.error('Image insert error:', imgError?.message || imgError);
      }
    }

    await syncProductFilters(product.id, body?.filterOptionIds, String(createPayload.productTypeId));

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
