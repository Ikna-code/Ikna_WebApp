import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

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
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const productTypes = await prisma.productType.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      subcategories: {
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return NextResponse.json(productTypes);
}