import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { db } from '@/backend/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { serializeDecimal } from '@/backend/lib/serializeDecimal';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object') {
    const candidate = value as { toNumber?: () => number; toString?: () => string };
    if (typeof candidate.toNumber === 'function') {
      const parsed = candidate.toNumber();
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof candidate.toString === 'function') {
      const parsed = Number(candidate.toString());
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return 0;
}

async function getAuthorizedAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

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
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { error: null };
}

function getVipTag(totalSpent: number, ordersCount: number) {
  if (totalSpent >= 15000 || ordersCount >= 12) return 'VIP';
  if (totalSpent >= 7000 || ordersCount >= 6) return 'Loyal';
  return 'New';
}

export async function GET() {
  const auth = await getAuthorizedAdmin();
  if (auth.error) return auth.error;

  const users = await db.user.findMany({
    where: {
      OR: [
        { role: Role.USER },
        { orders: { some: {} } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      orders: {
        select: {
          totalAmount: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      email: 'asc',
    },
  });

  const customers = users
    .map((user) => {
      const orders = user.orders || [];
      const ordersCount = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0);

      const firstOrder = orders.reduce<Date | null>((earliest, order) => {
        const date = new Date(order.createdAt);
        if (Number.isNaN(date.getTime())) return earliest;
        if (!earliest || date.getTime() < earliest.getTime()) return date;
        return earliest;
      }, null);

      const fallbackName = user.email ? user.email.split('@')[0] : 'Customer';
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

      return {
        id: user.id,
        name: fullName || fallbackName,
        email: user.email,
        phone: user.phone || '-',
        ordersCount,
        totalSpent: Math.round(totalSpent),
        joinDate: firstOrder ? firstOrder.toISOString() : null,
        tag: getVipTag(totalSpent, ordersCount),
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return NextResponse.json(
    serializeDecimal({
      source: 'supabase-db',
      customers,
    }),
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
