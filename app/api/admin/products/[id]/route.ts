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

    const updateData: {
      name?: string;
      price?: number;
      stock?: number;
      category?: string;
      image?: string;
      description?: string;
      tag?: string | null;
      sizes?: string[];
    } = {};

    if (typeof body?.name === 'string') updateData.name = body.name;
    if (typeof body?.price === 'number') updateData.price = body.price;
    if (typeof body?.stock === 'number') updateData.stock = body.stock;
    if (typeof body?.category === 'string') updateData.category = body.category;
    if (typeof body?.image === 'string') updateData.image = body.image;
    if (typeof body?.description === 'string') updateData.description = body.description;
    if (typeof body?.tag === 'string' || body?.tag === null) updateData.tag = body.tag;
    if (Array.isArray(body?.sizes)) {
      updateData.sizes = body.sizes.filter((item: unknown) => typeof item === 'string');
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

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
