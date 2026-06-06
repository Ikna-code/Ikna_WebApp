import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { createSupabaseAdminClient } from '@/backend/lib/supabaseAdmin';
import { deleteImage, extractCloudinaryPublicId } from '@/src/lib/cloudinary';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Service role client bypasses all Supabase RLS policies — use only in server-side admin routes.
const supabaseAdmin = createSupabaseAdminClient();

const createImageId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

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

    const removeImageIds: string[] = Array.isArray(body?.removeImageIds)
      ? body.removeImageIds.filter((item: unknown) => typeof item === 'string' && item.length > 0)
      : [];
    const removeImagePaths: string[] = Array.isArray(body?.removeImagePaths)
      ? body.removeImagePaths.filter((item: unknown) => typeof item === 'string' && item.length > 0)
      : [];
    const imagePaths: string[] = Array.isArray(body?.imagePaths)
      ? body.imagePaths.filter((item: unknown) => typeof item === 'string' && item.length > 0)
      : [];

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

    const updateData: {
      name?: string;
      price?: number;
      stock?: number;
      category?: string;
      image?: string;
      description?: string;
      tag?: string | null;
      rating?: number | null;
      sizes?: string[];
    } = {};

    if (typeof body?.name === 'string') updateData.name = body.name;
    if (typeof body?.price === 'number') updateData.price = body.price;
    if (typeof body?.stock === 'number') updateData.stock = body.stock;
    if (typeof body?.category === 'string') updateData.category = body.category;
    if (typeof body?.image === 'string') updateData.image = body.image;
    if (typeof body?.description === 'string') updateData.description = body.description;
    if (typeof body?.tag === 'string' || body?.tag === null) updateData.tag = body.tag;
    if (typeof body?.rating === 'number' || body?.rating === null) updateData.rating = body.rating;
    if (Array.isArray(body?.sizes)) {
      updateData.sizes = body.sizes.filter((item: unknown) => typeof item === 'string');
    }

    const hasScalarUpdates = Object.keys(updateData).length > 0;
    const hasImageUpdates = imagePaths.length > 0 || orderedRemovals.length > 0;
    if (!hasScalarUpdates && !hasImageUpdates) {
      return NextResponse.json({
        id,
        message: 'No changes detected',
      });
    }

    // Use service role Supabase client for all DB writes to bypass RLS.
    if (imagesToDeleteOnly.length) {
      const deleteIds = imagesToDeleteOnly.map((image) => image.id);
      const { error: deleteImgError } = await supabaseAdmin
        .from('product_images')
        .delete()
        .in('id', deleteIds);

      if (deleteImgError) {
        throw new Error(`Failed to delete images: ${deleteImgError.message}`);
      }
    }

    if (replacementPairs.length) {
      for (const replacement of replacementPairs) {
        const { error: replaceError } = await supabaseAdmin
          .from('product_images')
          .update({
            image_path: replacement.nextPath,
            public_id: extractCloudinaryPublicId(replacement.nextPath) || null,
          })
          .eq('id', replacement.target.id);

        if (replaceError) {
          throw new Error(`Failed to replace image: ${replaceError.message}`);
        }
      }
    }

    if (imagePathsToInsert.length) {
      const hasPrimaryImage = existingProduct.images.some((image) =>
        seenRemovalIds.has(image.id) ? false : Boolean(image.is_primary)
      );
      const { error: insertImgError } = await supabaseAdmin
        .from('product_images')
        .insert(
          imagePathsToInsert.map((path: string, index: number) => ({
            id: createImageId(),
            product_id: id,
            image_path: path,
            public_id: extractCloudinaryPublicId(path) || null,
            is_primary: !hasPrimaryImage && index === 0,
          }))
        );

      if (insertImgError) {
        throw new Error(`Failed to insert images: ${insertImgError.message}`);
      }

      if (!updateData.image) {
        updateData.image = imagePathsToInsert[0] || replacementPairs[0]?.nextPath;
      }
    }

    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('Product')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update product: ${updateError.message}`);
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
          await supabaseAdmin.storage.from('products').remove(storagePaths);
        }
      } catch {
        // Storage cleanup failure should not block successful product updates.
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Delete via service role client to bypass RLS.
    const { error: deleteError } = await supabaseAdmin
      .from('Product')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
