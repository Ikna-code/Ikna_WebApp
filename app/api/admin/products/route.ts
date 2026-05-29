import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

async function requireAdmin() {
  const dbUser = await ensureCurrentDbUser();

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    return null;
  }

  return dbUser.id;
}

export async function GET() {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    const product = await prisma.product.create({
      data: {
        name: body.name,
        price: body.price,
        stock: body.stock,
        category: body.category || 'Bras',
        image: primaryImagePath,
        description: body.description,
        tag: body.tag || null,
        sizes,
        images: imagePaths.length
          ? {
              create: imagePaths.map((path: string, index: number) => ({
                image_path: path,
                is_primary: index === 0,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
