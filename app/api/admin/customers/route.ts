import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { db } from '@/backend/lib/db';
import { serializeDecimal } from '@/backend/lib/serializeDecimal';
import { markTimedOutCheckoutSessions } from '@/backend/services/customerCheckoutSession';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type CheckoutStep =
  | 'BROWSING'
  | 'CART'
  | 'CHECKOUT_STARTED'
  | 'ADDRESS_ADDED'
  | 'SHIPPING_SELECTED'
  | 'PAYMENT_STARTED'
  | 'ORDER_COMPLETED';

type CheckoutStatus =
  | 'ACTIVE'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'ABANDONED_CART'
  | 'CONVERTED'
  | 'INACTIVE';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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

function getPositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function resolveCustomerBadge(totalSpent: number, ordersCount: number) {
  if (totalSpent >= 20000 || ordersCount >= 12) return 'VIP';
  if (totalSpent >= 9000 || ordersCount >= 7) return 'Loyal';
  if (ordersCount >= 2) return 'Returning';
  if (ordersCount === 1) return 'New';
  return 'Guest';
}

function getDisplayName(user: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (fullName) return fullName;
  const fromEmail = String(user.email || '').split('@')[0]?.trim();
  return fromEmail || 'Customer';
}

function avatarFromName(name: string) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
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

function toRelativeLabel(value: Date | null) {
  if (!value) return 'No activity';
  const diffMs = Date.now() - value.getTime();
  if (diffMs < 0) return 'Just now';
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  if (diffHours < 48) return 'Yesterday';
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthorizedAdmin();
  if (auth.error) return auth.error;

  await markTimedOutCheckoutSessions().catch((error) => {
    console.error('[admin-customers] timed-out-session sweep failed', error);
  });

  const params = request.nextUrl.searchParams;
  const page = getPositiveInt(params.get('page'), DEFAULT_PAGE, 100000);
  const pageSize = getPositiveInt(params.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const search = String(params.get('search') || '').trim();
  const name = String(params.get('name') || '').trim();
  const email = String(params.get('email') || '').trim();
  const phone = String(params.get('phone') || '').trim();
  const dateJoinedFrom = String(params.get('dateJoinedFrom') || '').trim();
  const dateJoinedTo = String(params.get('dateJoinedTo') || '').trim();
  const customerType = String(params.get('customerType') || '').trim();
  const checkoutStep = String(params.get('checkoutStep') || '').trim().toUpperCase() as CheckoutStep | '';
  const checkoutStatus = String(params.get('status') || '').trim().toUpperCase() as CheckoutStatus | '';
  const hasOrders = params.get('hasOrders');
  const hasAbandonedCart = params.get('hasAbandonedCart');

  const sessionStore = (db as any).customerCheckoutSession;

  let sessionFilteredUserIds: string[] | null = null;
  if (sessionStore && (checkoutStep || checkoutStatus || hasAbandonedCart === 'true')) {
    const sessionWhere: Record<string, unknown> = {};
    if (checkoutStep) sessionWhere.step = checkoutStep;
    if (checkoutStatus) sessionWhere.status = checkoutStatus;
    if (hasAbandonedCart === 'true') sessionWhere.status = 'ABANDONED_CART';

    const matchingSessions = await sessionStore.findMany({
      where: sessionWhere,
      select: { userId: true },
      take: 50000,
    });

    sessionFilteredUserIds = Array.from(new Set(matchingSessions.map((row: any) => String(row.userId))));
    if (!sessionFilteredUserIds.length) {
      return NextResponse.json(
        serializeDecimal({
          source: 'supabase-db',
          customers: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
          summary: {
            totalCustomers: 0,
            customersWithOrders: 0,
            customersInCheckout: 0,
            abandonedCarts: 0,
            potentialRevenueLost: 0,
          },
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
  }

  const userWhere: any = {
    OR: [{ role: Role.USER }, { orders: { some: {} } }],
  };

  if (search) {
    userWhere.AND = [
      ...(userWhere.AND || []),
      {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  if (name) {
    userWhere.AND = [
      ...(userWhere.AND || []),
      {
        OR: [
          { firstName: { contains: name, mode: 'insensitive' } },
          { lastName: { contains: name, mode: 'insensitive' } },
        ],
      },
    ];
  }

  if (email) {
    userWhere.AND = [...(userWhere.AND || []), { email: { contains: email, mode: 'insensitive' } }];
  }

  if (phone) {
    userWhere.AND = [...(userWhere.AND || []), { phone: { contains: phone, mode: 'insensitive' } }];
  }

  if (dateJoinedFrom || dateJoinedTo) {
    const createdAtRange: Record<string, Date> = {};
    if (dateJoinedFrom) {
      const fromDate = new Date(dateJoinedFrom);
      if (!Number.isNaN(fromDate.getTime())) {
        createdAtRange.gte = fromDate;
      }
    }
    if (dateJoinedTo) {
      const toDate = new Date(dateJoinedTo);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        createdAtRange.lte = toDate;
      }
    }

    if (Object.keys(createdAtRange).length) {
      userWhere.AND = [
        ...(userWhere.AND || []),
        {
          orders: {
            some: {
              createdAt: createdAtRange,
            },
          },
        },
      ];
    }
  }

  if (sessionFilteredUserIds) {
    userWhere.AND = [...(userWhere.AND || []), { id: { in: sessionFilteredUserIds } }];
  }

  if (hasOrders === 'true') {
    userWhere.AND = [...(userWhere.AND || []), { orders: { some: {} } }];
  }

  if (hasOrders === 'false') {
    userWhere.AND = [...(userWhere.AND || []), { orders: { none: {} } }];
  }

  const totalUsers = await db.user.count({ where: userWhere });
  const skip = (page - 1) * pageSize;

  const users = await db.user.findMany({
    where: userWhere,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      orders: {
        select: {
          id: true,
          totalAmount: true,
          createdAt: true,
          status: true,
        },
      },
    },
    orderBy: {
      email: 'asc',
    },
    skip,
    take: pageSize,
  });

  const userIds = users.map((u) => u.id);

  const [cartRows, sessionRows] = await Promise.all([
    db.cartItem.findMany({
      where: {
        userId: { in: userIds.length ? userIds : [''] },
      },
      select: {
        userId: true,
        quantity: true,
        selectedSize: true,
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            colorName: true,
          },
        },
      },
    }),
    sessionStore
      ? sessionStore.findMany({
          where: {
            userId: { in: userIds.length ? userIds : [''] },
          },
          select: {
            userId: true,
            step: true,
            status: true,
            cartValue: true,
            potentialRecovery: true,
            lastActivityAt: true,
            updatedAt: true,
            timeline: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const cartByUser = new Map<string, { cartValue: number }>();
  for (const row of cartRows) {
    const existing = cartByUser.get(row.userId) || { cartValue: 0 };
    const lineTotal = Math.max(Number(row.quantity || 0), 0) * Math.max(toNumber(row.product?.price ?? 0), 0);
    existing.cartValue += lineTotal;
    cartByUser.set(row.userId, existing);
  }

  const sessionByUser = new Map<string, any>();
  for (const row of sessionRows as any[]) {
    sessionByUser.set(String(row.userId), row);
  }

  let customers = users.map((user) => {
    const orders = user.orders || [];
    const ordersCount = orders.length;
    const lifetimeSpend = Math.round(orders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0));
    const latestOrderAt = orders.reduce<Date | null>((latest, order) => {
      const date = new Date(order.createdAt);
      if (Number.isNaN(date.getTime())) return latest;
      if (!latest || date.getTime() > latest.getTime()) return date;
      return latest;
    }, null);
    const earliestOrderAt = orders.reduce<Date | null>((earliest, order) => {
      const date = new Date(order.createdAt);
      if (Number.isNaN(date.getTime())) return earliest;
      if (!earliest || date.getTime() < earliest.getTime()) return date;
      return earliest;
    }, null);

    const nameValue = getDisplayName(user);
    const session = sessionByUser.get(user.id);
    const cartValue = Math.round(cartByUser.get(user.id)?.cartValue || toNumber(session?.cartValue || 0));
    const step = (session?.step || (cartValue > 0 ? 'CART' : 'BROWSING')) as CheckoutStep;
    const status = (session?.status || (cartValue > 0 ? 'ACTIVE' : 'INACTIVE')) as CheckoutStatus;

    const lastActivityAt = session?.lastActivityAt
      ? new Date(session.lastActivityAt)
      : latestOrderAt || null;

    const badge = resolveCustomerBadge(lifetimeSpend, ordersCount);
    const isAbandoned = status === 'ABANDONED_CART';
    const potentialRecovery = Math.round(toNumber(session?.potentialRecovery || (isAbandoned ? cartValue : 0)));

    return {
      id: user.id,
      avatar: avatarFromName(nameValue),
      name: nameValue,
      email: user.email,
      phone: user.phone || '-',
      ordersCount,
      lifetimeSpend,
      currentCartValue: cartValue,
      checkoutStep: step,
      status,
      isAbandoned,
      potentialRecovery,
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      lastActivityLabel: toRelativeLabel(lastActivityAt),
      joinDate: earliestOrderAt ? earliestOrderAt.toISOString() : null,
      customerType: badge,
    };
  });

  if (customerType) {
    const normalizedType = customerType.trim().toUpperCase();
    customers = customers.filter((customer) => customer.customerType.toUpperCase() === normalizedType);
  }

  const summaryTotalCustomers = await db.user.count({
    where: {
      OR: [{ role: Role.USER }, { orders: { some: {} } }],
    },
  });

  const summaryCustomersWithOrders = await db.user.count({
    where: {
      OR: [{ role: Role.USER }, { orders: { some: {} } }],
      orders: { some: {} },
    },
  });

  let summaryCustomersInCheckout = 0;
  let summaryAbandonedCarts = 0;
  let summaryPotentialRevenueLost = 0;

  if (sessionStore) {
    const [checkoutCount, abandonedCount, abandonedSum] = await Promise.all([
      sessionStore.count({
        where: {
          status: {
            in: ['ACTIVE', 'PAYMENT_PENDING', 'PAYMENT_FAILED'],
          },
        },
      }),
      sessionStore.count({
        where: {
          status: 'ABANDONED_CART',
        },
      }),
      sessionStore.aggregate({
        _sum: {
          potentialRecovery: true,
        },
        where: {
          status: 'ABANDONED_CART',
        },
      }),
    ]);

    summaryCustomersInCheckout = Number(checkoutCount || 0);
    summaryAbandonedCarts = Number(abandonedCount || 0);
    summaryPotentialRevenueLost = Math.round(toNumber(abandonedSum?._sum?.potentialRecovery || 0));
  }

  const totalPages = Math.ceil(totalUsers / pageSize);

  return NextResponse.json(
    serializeDecimal({
      source: 'supabase-db',
      customers,
      pagination: {
        page,
        pageSize,
        total: totalUsers,
        totalPages,
      },
      summary: {
        totalCustomers: summaryTotalCustomers,
        customersWithOrders: summaryCustomersWithOrders,
        customersInCheckout: summaryCustomersInCheckout,
        abandonedCarts: summaryAbandonedCarts,
        potentialRevenueLost: summaryPotentialRevenueLost,
      },
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
