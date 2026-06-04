import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { createSupabaseAdminClient } from '@/backend/lib/supabaseAdmin';

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
            is_primary: true,
          },
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const removeIdSet = new Set(removeImageIds);
    const removePathSet = new Set(removeImagePaths.map((path) => toStoragePath(path)));
    const imagesToDelete = existingProduct.images.filter(
      (image) => removeIdSet.has(image.id) || removePathSet.has(toStoragePath(image.image_path))
    );

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
    const hasImageUpdates = imagePaths.length > 0 || imagesToDelete.length > 0;
    if (!hasScalarUpdates && !hasImageUpdates) {
      return NextResponse.json({
        id,
        message: 'No changes detected',
      });
    }

    // Use service role Supabase client for all DB writes to bypass RLS.
    if (imagesToDelete.length) {
      const deleteIds = imagesToDelete.map((image) => image.id);
      const { error: deleteImgError } = await supabaseAdmin
        .from('product_images')
        .delete()
        .in('id', deleteIds);

      if (deleteImgError) {
        throw new Error(`Failed to delete images: ${deleteImgError.message}`);
      }
    }

    if (imagePaths.length) {
      const { error: resetPrimaryError } = await supabaseAdmin
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', id);

      if (resetPrimaryError) {
        throw new Error(`Failed to reset previous primary images: ${resetPrimaryError.message}`);
      }

      const { error: insertImgError } = await supabaseAdmin
        .from('product_images')
        .insert(
          imagePaths.map((path: string, index: number) => ({
            id: createImageId(),
            product_id: id,
            image_path: path,
            is_primary: index === 0,
          }))
        );

      if (insertImgError) {
        throw new Error(`Failed to insert images: ${insertImgError.message}`);
      }

      if (!updateData.image) {
        updateData.image = imagePaths[0];
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

    if (imagesToDelete.length) {
      try {
        const storagePaths = imagesToDelete
          .map((image) => toStoragePath(image.image_path))
          .filter((path) => path.length > 0);

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
