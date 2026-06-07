import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { db } from '@/backend/lib/db';
import { createServerSupabaseClient } from '@/backend/lib/supabaseServer';

type AnalyticsOrder = {
  id: string;
  totalAmount: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  orderItems: Array<{
    id: string;
    quantity: number;
    price: unknown;
    product: {
      id: string;
      name: string;
      image: string;
      category: string | null;
    } | null;
  }>;
};

const CHANNEL_COLORS = ['#840d5c', '#a33c82', '#c66aa0', '#d58cb5', '#e8bfd5', '#6d0b4b', '#b55a93', '#edd4e3'];

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

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

function formatMoney(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

function formatPct(value: number): string {
  const abs = Math.abs(value);
  return `${abs.toFixed(1)}%`;
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

function aggregateOrders(orders: AnalyticsOrder[]) {
  const totalSales = orders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0);
  const totalOrders = orders.length;
  const unitsSold = orders.reduce((sum, order) => {
    const orderUnits = order.orderItems.reduce((sub, item) => sub + Math.max(0, toNumber(item.quantity)), 0);
    return sum + orderUnits;
  }, 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  return {
    totalSales,
    totalOrders,
    unitsSold,
    avgOrderValue,
  };
}

function buildOverviewData(orders: AnalyticsOrder[], start: Date, end: Date) {
  const span = daysBetweenInclusive(start, end);
  const useMonthlyBuckets = span > 120;

  if (useMonthlyBuckets) {
    const monthly = new Map<string, number>();

    orders.forEach((order) => {
      const d = new Date(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly.set(key, (monthly.get(key) || 0) + toNumber(order.totalAmount));
    });

    const points: Array<{ label: string; tickLabel: string; current: number }> = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor.getTime() <= limit.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = cursor.toLocaleDateString('en-US', { month: 'short' });
      points.push({
        label,
        tickLabel: label,
        current: Math.round(monthly.get(key) || 0),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return points;
  }

  const daily = new Map<string, number>();
  orders.forEach((order) => {
    const d = startOfDay(new Date(order.createdAt));
    const key = d.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) || 0) + toNumber(order.totalAmount));
  });

  const labelStep = Math.max(1, Math.ceil(span / 8));
  return Array.from({ length: span }, (_, index) => {
    const d = addDays(start, index);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      label,
      tickLabel: index === 0 || index === span - 1 || index % labelStep === 0 ? label : '',
      current: Math.round(daily.get(key) || 0),
    };
  });
}

function buildChannels(orders: AnalyticsOrder[]) {
  const totals = new Map<string, number>();

  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      const categoryName = String(item.product?.category || 'Uncategorized').trim() || 'Uncategorized';
      const lineRevenue = Math.max(0, toNumber(item.price)) * Math.max(0, toNumber(item.quantity));
      totals.set(categoryName, (totals.get(categoryName) || 0) + lineRevenue);
    });
  });

  const sorted = Array.from(totals.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  return sorted.map((item, index) => ({
    ...item,
    percentage: `${Math.round(total > 0 ? (item.value / total) * 100 : 0)}%`,
    color: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
  }));
}

function buildTopProducts(orders: AnalyticsOrder[]) {
  const products = new Map<
    string,
    {
      productId: string;
      name: string;
      image: string;
      revenue: number;
      units: number;
    }
  >();

  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      if (!item.product) return;

      const key = item.product.id;
      const current = products.get(key) || {
        productId: item.product.id,
        name: item.product.name,
        image: item.product.image,
        revenue: 0,
        units: 0,
      };

      current.revenue += Math.max(0, toNumber(item.price)) * Math.max(0, toNumber(item.quantity));
      current.units += Math.max(0, toNumber(item.quantity));

      products.set(key, current);
    });
  });

  const badgeBackgrounds = ['bg-[#f8eaf2]', 'bg-[#f3ddea]', 'bg-[#edd4e3]', 'bg-[#f2dcea]'];

  return Array.from(products.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4)
    .map((item, index) => ({
      rank: index + 1,
      productId: item.productId,
      name: item.name,
      image: item.image,
      revenue: formatMoney(item.revenue),
      units: `${formatCount(item.units)} units`,
      bg: badgeBackgrounds[index % badgeBackgrounds.length],
    }));
}

function buildTrendData(orders: AnalyticsOrder[], end: Date) {
  const trendStart = addDays(startOfDay(end), -6);
  const daily = new Map<
    string,
    {
      orders: number;
      units: number;
    }
  >();

  orders.forEach((order) => {
    const day = startOfDay(new Date(order.createdAt));
    if (day.getTime() < trendStart.getTime() || day.getTime() > end.getTime()) return;

    const key = day.toISOString().slice(0, 10);
    const current = daily.get(key) || { orders: 0, units: 0 };
    current.orders += 1;
    current.units += order.orderItems.reduce((sum, item) => sum + Math.max(0, toNumber(item.quantity)), 0);
    daily.set(key, current);
  });

  const points = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(trendStart, index);
    const key = date.toISOString().slice(0, 10);
    const stat = daily.get(key) || { orders: 0, units: 0 };

    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      orders: stat.orders,
      units: stat.units,
    };
  });

  return {
    points,
    totals: {
      orders: points.reduce((sum, point) => sum + point.orders, 0),
      units: points.reduce((sum, point) => sum + point.units, 0),
    },
  };
}

function toRecentOrder(order: AnalyticsOrder) {
  return {
    id: order.id,
    status: order.status,
    totalAmount: toNumber(order.totalAmount),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        name: item.product?.name || 'Product',
      },
    })),
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthorizedAdmin();
  if (auth.error) return auth.error;

  const params = request.nextUrl.searchParams;

  const now = new Date();
  const defaultStart = addDays(startOfDay(now), -29);
  const defaultEnd = endOfDay(now);

  const queryStart = params.get('start');
  const queryEnd = params.get('end');

  const parsedStart = queryStart ? new Date(queryStart) : defaultStart;
  const parsedEnd = queryEnd ? new Date(queryEnd) : defaultEnd;

  const start = Number.isNaN(parsedStart.getTime()) ? defaultStart : startOfDay(parsedStart);
  const end = Number.isNaN(parsedEnd.getTime()) ? defaultEnd : endOfDay(parsedEnd);

  if (start.getTime() > end.getTime()) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  const span = daysBetweenInclusive(start, end);
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(span - 1));

  const [currentOrders, previousOrders, recentOrders] = await Promise.all([
    db.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                category: true,
              },
            },
          },
        },
      },
    }),
    db.order.findMany({
      where: {
        createdAt: {
          gte: previousStart,
          lte: previousEnd,
        },
      },
      include: {
        orderItems: true,
      },
    }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const current = aggregateOrders(currentOrders as unknown as AnalyticsOrder[]);
  const previous = aggregateOrders(previousOrders as unknown as AnalyticsOrder[]);

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const todaySales = (currentOrders as unknown as AnalyticsOrder[])
    .filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= todayStart && createdAt <= todayEnd;
    })
    .reduce((sum, order) => sum + toNumber(order.totalAmount), 0);

  const previousTodayStart = addDays(todayStart, -1);
  const previousTodayEnd = addDays(todayEnd, -1);
  const previousTodaySales = (previousOrders as unknown as AnalyticsOrder[])
    .filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= previousTodayStart && createdAt <= previousTodayEnd;
    })
    .reduce((sum, order) => sum + toNumber(order.totalAmount), 0);

  const metrics = [
    {
      title: 'Total Sales',
      value: formatMoney(current.totalSales),
      percentage: formatPct(pctChange(current.totalSales, previous.totalSales)),
      iconBg: 'bg-[#f8eaf2]',
      iconColor: 'text-[#840d5c]',
    },
    {
      title: "Today's Sales",
      value: formatMoney(todaySales),
      percentage: formatPct(pctChange(todaySales, previousTodaySales)),
      iconBg: 'bg-[#f3ddea]',
      iconColor: 'text-[#a33c82]',
    },
    {
      title: 'Orders',
      value: formatCount(current.totalOrders),
      percentage: formatPct(pctChange(current.totalOrders, previous.totalOrders)),
      iconBg: 'bg-[#edd4e3]',
      iconColor: 'text-[#6d0b4b]',
    },
    {
      title: 'Avg. Order Value',
      value: formatMoney(current.avgOrderValue),
      percentage: formatPct(pctChange(current.avgOrderValue, previous.avgOrderValue)),
      iconBg: 'bg-[#f7e8f1]',
      iconColor: 'text-[#840d5c]',
    },
    {
      title: 'Units Sold',
      value: formatCount(current.unitsSold),
      percentage: formatPct(pctChange(current.unitsSold, previous.unitsSold)),
      iconBg: 'bg-[#f2dcea]',
      iconColor: 'text-[#6d0b4b]',
    },
  ];

  const currentTypedOrders = currentOrders as unknown as AnalyticsOrder[];
  const channels = buildChannels(currentTypedOrders);
  const topProducts = buildTopProducts(currentTypedOrders);
  const trend = buildTrendData(currentTypedOrders, end);

  const payload = {
    source: 'supabase-db',
    metrics,
    overview: buildOverviewData(currentTypedOrders, start, end),
    channels,
    topProducts,
    trend,
    recentOrders: (recentOrders as unknown as AnalyticsOrder[]).map(toRecentOrder),
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
