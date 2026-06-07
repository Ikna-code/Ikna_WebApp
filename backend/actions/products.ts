  "use server"
  import { db } from "@/backend/lib/db";
  import { revalidatePath } from "next/cache";
  import { extractCloudinaryPublicId } from '@/src/lib/cloudinary';

  // Sanitize products for safe serialization across server-client boundary
  const sanitizeProduct = (product: any) => {
    if (!product) return product;
    return {
      ...product,
      price: product.price ? Number(product.price) : product.price,
      discountAmount: product.discountAmount ? Number(product.discountAmount) : product.discountAmount,
      totalAmount: product.totalAmount ? Number(product.totalAmount) : product.totalAmount,
    };
  };

  const toStoragePath = (pathOrUrl: string) => {
    const value = String(pathOrUrl || '').trim();
    if (!value) return '';

    const cloudinaryPublicId = extractCloudinaryPublicId(value);
    if (cloudinaryPublicId) {
      return cloudinaryPublicId;
    }

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
  };

  const isPathInProductFolder = (pathOrUrl: string, productId: string) => {
    const value = String(pathOrUrl || '').trim();
    if (value.includes('res.cloudinary.com')) {
      return true;
    }

    const normalized = toStoragePath(pathOrUrl);
    const productIdValue = String(productId).trim();
    const expectedPrefix = `product_photos/${productIdValue}/`;
    if (normalized.startsWith(expectedPrefix)) return true;

    // Legacy sku-based folders are still considered valid product image containers.
    const legacySkuPrefix = `product_photos/${String(productIdValue).replace(/[^0-9]/g, '')}/`;
    return legacySkuPrefix !== 'product_photos//' && normalized.startsWith(legacySkuPrefix);
  };

  // --- MIDDLEWARE-LIKE ROLE CHECK ---
  async function verifyAdmin() {
    // Logic: Get session from your Auth provider (Clerk/Auth.js)
    // For now, we simulate a check:
    const isAdmin = true; // Replace with: session?.user.role === 'ADMIN'
    if (!isAdmin) throw new Error("Unauthorized");
  }

  // 🟢 CREATE
  export async function createProduct(data: any) {
    await verifyAdmin();
    const product = await db.product.create({ data });
    revalidatePath("/"); 
    return sanitizeProduct(product);
  }

  // 🔵 READ (Public)
  export async function getAllProducts() {
    const products = await db.product.findMany({
      include: {
        reviews: {
          select: {
            rating: true // We only need the rating to calculate the average
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return products.map(sanitizeProduct);
  }

  // 🟡 UPDATE
  export async function updateProduct(id: string, data: any) {
    await verifyAdmin();
    await db.product.update({ where: { id }, data });
    revalidatePath("/");
  }

  // 🔴 DELETE
  export async function deleteProduct(id: string) {
    await verifyAdmin();
    await db.product.delete({ where: { id } });
    revalidatePath("/");
  }

  export const getProductWithImages = async (productId: string) => {
    const row = await db.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          select: {
            image_path: true,
            is_primary: true,
          },
          orderBy: [
            { is_primary: 'desc' },
            { id: 'asc' },
          ],
        },
      },
    });

    if (!row) return null;

    const productImages = Array.isArray(row.images) ? row.images : [];
    const safeImages = productImages.filter((image: { image_path?: string }) =>
      isPathInProductFolder(String(image?.image_path || ''), productId)
    );

    const normalizedImage = isPathInProductFolder(String(row.image || ''), productId)
      ? row.image
      : safeImages[0]?.image_path || row.image;

    return sanitizeProduct({
      ...row,
      image: normalizedImage,
      product_images: safeImages,
    });
  };

  export const getAllProductsWithPrimaryImage = async () => {
    const rows = await db.product.findMany({
      include: {
        images: {
          select: {
            image_path: true,
            is_primary: true,
          },
          where: {
            is_primary: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rows.map((row: any) => {
      const productImages = Array.isArray(row?.images) ? row.images : [];
      const safeImages = productImages.filter((image: { image_path?: string }) =>
        isPathInProductFolder(String(image?.image_path || ''), String(row?.id || ''))
      );

      const normalizedImage = isPathInProductFolder(String(row?.image || ''), String(row?.id || ''))
        ? row.image
        : safeImages[0]?.image_path || row?.image;

      return sanitizeProduct({
        ...row,
        image: normalizedImage,
        product_images: safeImages,
      });
    });
  };

  export async function getProductReviewStats(productId: string) {
    const [stats, breakdown, recentReviews] = await Promise.all([
      // 1. Get the average rating and total count
      db.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      
      // 2. Get the count for each star (5, 4, 3, 2, 1) for the bars
      db.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { rating: true },
      }),

      // 3. Get the actual reviews to display
      db.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: 10, // Load first 10
      })
    ]);

    return {
      average: stats._avg.rating || 0,
      totalCount: stats._count._all,
      breakdown,
      reviews: recentReviews
    };
  }