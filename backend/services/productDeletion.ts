import { db } from '@/backend/lib/db';
import { deleteImage, extractCloudinaryPublicId } from '@/src/lib/cloudinary';

type DeleteResult = {
  success: boolean;
  message: string;
};

// Cast as any to work around Prisma generated-client type lag on Windows (DLL lock prevents hot-reload).
// The actual DB columns isActive/isDeleted exist from migration 20260610110000.
const dbProduct = (db as any).product;

const ACTIVE_PRODUCT_WHERE = {
  isDeleted: false,
  isActive: true,
} as const;

const normalizeId = (value: string) => String(value || '').trim();

const toUniquePublicIds = (items: Array<string | null | undefined>) => {
  const ids = new Set<string>();

  for (const value of items) {
    const raw = String(value || '').trim();
    if (!raw) continue;

    const publicId = extractCloudinaryPublicId(raw) || raw;
    if (publicId) ids.add(publicId);
  }

  return Array.from(ids);
};

const slugify = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export const createOrderItemSnapshot = (product: {
  name: string;
  image?: string | null;
  colorName?: string | null;
}) => ({
  productName: String(product.name || 'Product'),
  productImage: product.image || null,
  productColorName: product.colorName || null,
  productSlug: slugify(product.name) || null,
});

export async function deleteProduct(productId: string): Promise<DeleteResult> {
  const id = normalizeId(productId);
  if (!id) {
    return { success: false, message: 'Product id is required.' };
  }

  const existing = await db.product.findUnique({
    where: { id },
    select: { id: true, isDeleted: true },
  });

  if (!existing) {
    return { success: false, message: 'Product not found.' };
  }

  if (existing.isDeleted) {
    return { success: true, message: 'Product is already soft deleted.' };
  }

  await db.product.update({
    where: { id },
    data: {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
    },
  });

  return { success: true, message: 'Product soft deleted successfully.' };
}

export async function restoreProduct(productId: string): Promise<DeleteResult> {
  const id = normalizeId(productId);
  if (!id) {
    return { success: false, message: 'Product id is required.' };
  }

  const existing = await db.product.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, message: 'Product not found.' };
  }

  await db.product.update({
    where: { id },
    data: {
      isDeleted: false,
      isActive: true,
      deletedAt: null,
    },
  });

  return { success: true, message: 'Product restored successfully.' };
}

export async function hardDeleteProduct(productId: string): Promise<DeleteResult> {
  const id = normalizeId(productId);
  if (!id) {
    return { success: false, message: 'Product id is required.' };
  }

  const existing = await db.product.findUnique({
    where: { id },
    select: {
      id: true,
      image: true,
      images: {
        select: {
          image_path: true,
          public_id: true,
        },
      },
    },
  });

  if (!existing) {
    return { success: false, message: 'Product not found.' };
  }

  const orderItemCount = await db.orderItem.count({
    where: { productId: id },
  });

  if (orderItemCount > 0) {
    return {
      success: false,
      message: 'Cannot permanently delete a product that exists in order history.',
    };
  }

  const cloudinaryPublicIds = toUniquePublicIds([
    existing.image,
    ...existing.images.flatMap((image) => [image.public_id, image.image_path]),
  ]);

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM "_ComboPackToProduct" WHERE "B" = ${id}`;
    await tx.$executeRaw`DELETE FROM "_ComboProducts" WHERE "B" = ${id}`;

    await tx.productFilter.deleteMany({ where: { productId: id } });
    await tx.productImage.deleteMany({ where: { product_id: id } });
    await tx.review.deleteMany({ where: { productId: id } });
    await tx.wishlistItem.deleteMany({ where: { productId: id } });
    await tx.cartItem.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });

  for (const publicId of cloudinaryPublicIds) {
    try {
      await deleteImage(publicId);
    } catch {
      // Cloudinary cleanup should not block DB consistency after hard delete.
    }
  }

  return { success: true, message: 'Product permanently deleted.' };
}

export { ACTIVE_PRODUCT_WHERE };
