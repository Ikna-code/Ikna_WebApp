import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { createSupabaseAdminClient } from '@/backend/lib/supabaseAdmin';
import { extractCloudinaryPublicId } from '@/src/lib/cloudinary';

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

const isNumericProductId = (value: string) => /^\d+$/.test(String(value || '').trim());

const normalizeNumericProductId = (value: string) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '';
};

const isDuplicateProductIdError = (error: any) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '23505' && /Product.*id|Product_pkey|duplicate key/i.test(message);
};

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

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
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

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

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

    const primaryImagePath =
      typeof body?.image === 'string' && body.image.length > 0
        ? body.image
        : imagePaths[0] ||
          'https://images.unsplash.com/photo-1567016549366-5f3194bab37b?w=400&auto=format&fit=crop';

    const sizes: string[] = Array.isArray(body?.sizes)
      ? body.sizes.filter((item: unknown) => typeof item === 'string' && item.length > 0)
      : [];

    const requestedIdRaw = typeof body?.id === 'string' ? body.id.trim() : '';
    const requestedId = isNumericProductId(requestedIdRaw)
      ? normalizeNumericProductId(requestedIdRaw)
      : '';

    const createPayload = {
      name: body.name,
      price: body.price,
      stock: body.stock,
      category: body.category || 'Bras',
      image: primaryImagePath,
      description: body.description,
      tag: body.tag || null,
      rating: typeof body?.rating === 'number' ? body.rating : null,
      sizes,
    };

    const maxAttempts = 5;
    let attempt = 0;
    let product: any = null;
    let createError: any = null;

    while (attempt < maxAttempts) {
      const productId =
        attempt === 0 && requestedId ? requestedId : await getNextSequentialProductId();

      // Use service role Supabase client to bypass RLS for all writes.
      const result = await supabaseAdmin
        .from('Product')
        .insert({
          id: productId,
          ...createPayload,
        })
        .select()
        .single();

      product = result.data;
      createError = result.error;

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

    if (imagePaths.length) {
      const { error: imgError } = await supabaseAdmin
        .from('product_images')
        .insert(
          imagePaths.map((path: string, index: number) => ({
            id: createImageId(),
            product_id: product.id,
            image_path: path,
            public_id: extractCloudinaryPublicId(path) || null,
            is_primary: index === 0,
          }))
        );

      if (imgError) {
        // Product was created; log but don't fail the whole request.
        console.error('Image insert error:', imgError.message);
      }
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
