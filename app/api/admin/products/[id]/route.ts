import { NextRequest, NextResponse } from 'next/server';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { deleteImage, extractCloudinaryPublicId } from '@/src/lib/cloudinary';
import { deleteProduct, hardDeleteProduct, restoreProduct } from '@/backend/services/productDeletion';

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
      const existing = await prismaAny.productType.findUnique({ where: { id: explicitId } });
      if (existing) return existing.id;
    }

    const explicitSlug = typeof body?.productTypeSlug === 'string' ? body.productTypeSlug.trim() : '';
    if (explicitSlug) {
      const existingBySlug = await prismaAny.productType.findUnique({ where: { slug: explicitSlug } });
      if (existingBySlug) return existingBySlug.id;
    }

    const baseName = typeof body?.productTypeName === 'string' && body.productTypeName.trim()
      ? body.productTypeName.trim()
      : typeof body?.category === 'string' && body.category.trim()
        ? body.category.trim()
        : '';

    if (!baseName) return '';

    const baseSlug = slugify(baseName) || 'general';
    const existing = await prismaAny.productType.findUnique({ where: { slug: baseSlug } });
    if (existing) return existing.id;

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
    // If ProductType model/table is unavailable in this environment, skip mapping.
    return '';
  }
}

async function resolveSubCategoryId(body: any, productTypeId: string) {
  if (!productTypeId) return '';

  try {
    const explicitId = typeof body?.subCategoryId === 'string' ? body.subCategoryId.trim() : '';
    if (explicitId) {
      const existing = await prismaAny.subCategory.findUnique({ where: { id: explicitId } });
      if (existing?.id && String(existing.productTypeId) === String(productTypeId)) {
        return existing.id;
      }
    }

    const explicitSlug = typeof body?.subCategorySlug === 'string' ? body.subCategorySlug.trim() : '';
    if (explicitSlug) {
      const existingBySlug = await prismaAny.subCategory.findFirst({
        where: {
          productTypeId,
          slug: explicitSlug,
        },
      });
      if (existingBySlug?.id) return existingBySlug.id;
    }

    const explicitName = typeof body?.subCategoryName === 'string'
      ? body.subCategoryName.trim()
      : typeof body?.subCategory === 'string'
        ? body.subCategory.trim()
        : '';

    if (!explicitName) return '';

    const existingByName = await prismaAny.subCategory.findFirst({
      where: {
        productTypeId,
        name: explicitName,
      },
    });
    if (existingByName?.id) return existingByName.id;

    const normalizedSlug = slugify(explicitName);
    if (!normalizedSlug) return '';

    const existingByNormalizedSlug = await prismaAny.subCategory.findFirst({
      where: {
        productTypeId,
        slug: normalizedSlug,
      },
    });
    return existingByNormalizedSlug?.id || '';
  } catch {
    return '';
  }
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (String(body?.action || '').toLowerCase() === 'restore') {
      const result = await restoreProduct(id);
      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: result.message });
    }

    const removeImageIds: string[] = Array.isArray(body?.removeImageIds)
      ? body.removeImageIds.filter((item: unknown) => typeof item === 'string' && item.length > 0)
      : [];
    const removeImagePaths: string[] = Array.isArray(body?.removeImagePaths)
      ? body.removeImagePaths.filter((item: unknown) => typeof item === 'string' && item.length > 0)
      : [];
    const imagePaths: string[] = Array.isArray(body?.imagePaths)
      ? body.imagePaths.filter((item: unknown) => typeof item === 'string' && item.length > 0)
      : [];
    const requestedPrimaryImagePath =
      typeof body?.primaryImagePath === 'string' && body.primaryImagePath.trim().length > 0
        ? body.primaryImagePath.trim()
        : typeof body?.image === 'string' && body.image.trim().length > 0
          ? body.image.trim()
          : '';

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          select: {
            id: true,
            image_path: true,
            public_id: true,
            is_primary: true,
          },
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const imageById = new Map(existingProduct.images.map((image) => [image.id, image]));
    const imageByKey = new Map(existingProduct.images.map((image) => [toImageKey(image.image_path), image]));
    const orderedRemovals: Array<(typeof existingProduct.images)[number]> = [];
    const seenRemovalIds = new Set<string>();

    for (const removeId of removeImageIds) {
      const matched = imageById.get(removeId);
      if (matched && !seenRemovalIds.has(matched.id)) {
        orderedRemovals.push(matched);
        seenRemovalIds.add(matched.id);
      }
    }

    for (const removePath of removeImagePaths) {
      const matched = imageByKey.get(toImageKey(removePath));
      if (matched && !seenRemovalIds.has(matched.id)) {
        orderedRemovals.push(matched);
        seenRemovalIds.add(matched.id);
      }
    }

    const replacementCount = Math.min(orderedRemovals.length, imagePaths.length);
    const replacementPairs = Array.from({ length: replacementCount }, (_, index) => ({
      target: orderedRemovals[index],
      nextPath: imagePaths[index],
    }));
    const imagesToDeleteOnly = orderedRemovals.slice(replacementCount);
    const imagePathsToInsert = imagePaths.slice(replacementCount);

    const updateData: Record<string, any> = {};

    if (typeof body?.name === 'string') updateData.name = body.name;
    if (typeof body?.price === 'number') updateData.price = body.price;
    if (typeof body?.stock === 'number') updateData.stock = body.stock;
    if (typeof body?.category === 'string') updateData.category = body.category;
    const resolvedProductTypeId = await resolveProductTypeId(body);
    if (resolvedProductTypeId) updateData.productType = { connect: { id: resolvedProductTypeId } };
    const effectiveProductTypeIdForSubcategory = String(resolvedProductTypeId || existingProduct.productTypeId || '').trim();
    const resolvedSubCategoryId = await resolveSubCategoryId(body, effectiveProductTypeIdForSubcategory);
    if (typeof body?.subCategoryId === 'string' || typeof body?.subCategory === 'string' || typeof body?.subCategoryName === 'string') {
      updateData.subCategory = resolvedSubCategoryId
        ? { connect: { id: resolvedSubCategoryId } }
        : { disconnect: true };
    }
    if (typeof body?.image === 'string') updateData.image = body.image;
    if (requestedPrimaryImagePath) updateData.image = requestedPrimaryImagePath;
    if (typeof body?.description === 'string') updateData.description = body.description;
    if (typeof body?.tag === 'string' || body?.tag === null) updateData.tag = body.tag;
    if (typeof body?.rating === 'number' || body?.rating === null) updateData.rating = body.rating;
    if (typeof body?.fabricType === 'string') updateData.fabricType = body.fabricType;
    if (typeof body?.colorHex === 'string' || body?.colorHex === null) {
      updateData.colorHex = typeof body?.colorHex === 'string' ? body.colorHex.trim() : null;
    }
    if (typeof body?.colorName === 'string' || body?.colorName === null) {
      updateData.colorName = typeof body?.colorName === 'string' ? body.colorName.trim() : null;
    }
    if (Array.isArray(body?.sizes)) {
      updateData.sizes = body.sizes.filter((item: unknown) => typeof item === 'string');
    }

    const hasScalarUpdates = Object.keys(updateData).length > 0;
    const hasImageUpdates = imagePaths.length > 0 || orderedRemovals.length > 0;
    const hasFilterUpdates = Array.isArray(body?.filterOptionIds);
    if (!hasScalarUpdates && !hasImageUpdates && !hasFilterUpdates) {
      return NextResponse.json({
        id,
        message: 'No changes detected',
      });
    }

    // Use service role Supabase client for all DB writes to bypass RLS.
    if (imagesToDeleteOnly.length) {
      const deleteIds = imagesToDeleteOnly.map((image) => image.id);
      await prisma.productImage.deleteMany({
        where: {
          id: {
            in: deleteIds,
          },
        },
      });
    }

    if (replacementPairs.length) {
      for (const replacement of replacementPairs) {
        await prisma.productImage.update({
          where: {
            id: replacement.target.id,
          },
          data: {
            image_path: replacement.nextPath,
            public_id: extractCloudinaryPublicId(replacement.nextPath) || null,
          },
        });
      }
    }

    if (imagePathsToInsert.length) {
      const hasPrimaryImage = existingProduct.images.some((image) =>
        seenRemovalIds.has(image.id) ? false : Boolean(image.is_primary)
      );
      await prisma.productImage.createMany({
        data: imagePathsToInsert.map((path: string, index: number) => ({
          id: createImageId(),
          product_id: id,
          image_path: path,
          public_id: extractCloudinaryPublicId(path) || null,
          is_primary: !hasPrimaryImage && index === 0,
        })),
      });

      if (!updateData.image) {
        updateData.image = imagePathsToInsert[0] || replacementPairs[0]?.nextPath;
      }
    }

    if (!updateData.image && requestedPrimaryImagePath) {
      updateData.image = requestedPrimaryImagePath;
    }

    // fabricType is not yet in the stale Prisma client — extract it and persist via raw SQL
    const fabricTypeValue: string | undefined = typeof updateData.fabricType === 'string' ? updateData.fabricType : undefined;
    delete updateData.fabricType;

    const updatedProduct = await prismaAny.product.update({
      where: { id },
      data: updateData,
    });

    if (fabricTypeValue !== undefined) {
      await prisma.$executeRaw`UPDATE "Product" SET "fabricType" = ${fabricTypeValue} WHERE "id" = ${id}`;
      (updatedProduct as any).fabricType = fabricTypeValue;
    }

    const effectiveProductTypeId = String(
      (updateData.productType as any)?.connect?.id || existingProduct.productTypeId || ''
    ).trim();
    if (hasFilterUpdates) {
      await syncProductFilters(id, body?.filterOptionIds, effectiveProductTypeId);
    }

    if (orderedRemovals.length) {
      try {
        const cloudinaryPublicIds = orderedRemovals
          .map((image) => String(image.public_id || '').trim() || extractCloudinaryPublicId(image.image_path))
          .filter((value) => value.length > 0);

        for (const publicId of cloudinaryPublicIds) {
          await deleteImage(publicId);
        }

        const storagePaths = orderedRemovals
          .map((image) => toStoragePath(image.image_path))
          .filter((path) => path.length > 0 && !extractCloudinaryPublicId(path));

        if (storagePaths.length) {
          // Optional storage cleanup disabled here to avoid non-critical failures.
        }
      } catch {
        // Storage cleanup failure should not block successful product updates.
      }
    }

    if (requestedPrimaryImagePath) {
      const primaryKey = toImageKey(requestedPrimaryImagePath);
      const latestImages = await prisma.productImage.findMany({
        where: { product_id: id },
        select: { id: true, image_path: true },
      });
      const matchedPrimary = latestImages.find((image) => toImageKey(image.image_path) === primaryKey);

      if (matchedPrimary) {
        await prisma.productImage.updateMany({
          where: { product_id: id },
          data: { is_primary: false },
        });
        await prisma.productImage.update({
          where: { id: matchedPrimary.id },
          data: { is_primary: true },
        });
      }
    }

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const mode = request.nextUrl.searchParams.get('mode');

    const result = mode === 'hard' ? await hardDeleteProduct(id) : await deleteProduct(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
