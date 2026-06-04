import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { db } from '@/backend/lib/db';
import { createServerSupabaseClient } from '@/backend/lib/supabaseServer';

async function getAuthorizedAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  let dbUser = await db.user.findUnique({ where: { id: user.id } });

  if (!dbUser && process.env.NODE_ENV !== 'production') {
    dbUser = await db.user.create({
      data: {
        id: user.id,
        email: user.email ?? '',
        role: Role.ADMIN,
      },
    });
  }

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: dbUser, error: null };
}

export async function GET() {
  const auth = await getAuthorizedAdmin();
  if (auth.error) return auth.error;

  const orders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(orders, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
