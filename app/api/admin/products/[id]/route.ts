import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { createSupabaseAdminClient } from '@/backend/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

async function requireAdmin() {
  const dbUser = await ensureCurrentDbUser();

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    return null;
  }

  return dbUser.id;
}

function toStoragePath(pathOrUrl: string) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    const marker = '/storage/v1/object/public/products/';
    const markerIndex = value.indexOf(marker);
    if (markerIndex >= 0) {
      return value.slice(markerIndex + marker.length);
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

    const updatedProduct = await prisma.$transaction(async (tx) => {
      if (imagesToDelete.length) {
        await tx.productImage.deleteMany({
          where: {
            id: {
              in: imagesToDelete.map((image) => image.id),
            },
          },
        });
      }

      if (imagePaths.length) {
        await tx.productImage.createMany({
          data: imagePaths.map((path: string, index: number) => ({
            product_id: id,
            image_path: path,
            is_primary: index === 0,
          })),
        });
      }

      return tx.product.update({
        where: { id },
        data: updateData,
      });
    });

    if (imagesToDelete.length) {
      try {
        const supabase = createSupabaseAdminClient();
        const storagePaths = imagesToDelete
          .map((image) => toStoragePath(image.image_path))
          .filter((path) => path.length > 0);

        if (storagePaths.length) {
          await supabase.storage.from('products').remove(storagePaths);
        }
      } catch {
        // Storage cleanup failure should not block successful product updates.
      }
    }

    return NextResponse.json(updatedProduct);
  } catch {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
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

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
