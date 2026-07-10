import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { db } from '@/backend/lib/db';
import { serializeDecimal } from '@/backend/lib/serializeDecimal';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Params = {
  params: Promise<{
    customerId: string;
  }>;
};

function isCheckoutSessionStoreMissingError(error: unknown) {
  const code = typeof error === 'object' && error ? String((error as { code?: string }).code || '') : '';
  const message = error instanceof Error ? error.message : String(error || '');
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    message.toLowerCase().includes('customer_checkout_sessions') ||
    message.toLowerCase().includes('customercheckoutsession') ||
    message.toLowerCase().includes('does not exist')
  );
}

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

function pickName(user: { email: string; firstName?: string | null; lastName?: string | null }) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (fullName) return fullName;
  const fromEmail = String(user.email || '').split('@')[0]?.trim();
  return fromEmail || 'Customer';
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

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthorizedAdmin();
  if (auth.error) return auth.error;

  const { customerId } = await params;
  const userId = String(customerId || '').trim();

  if (!userId) {
    return NextResponse.json({ error: 'Customer ID is required.' }, { status: 400 });
  }

  const sessionStore = (db as any).customerCheckoutSession;
  let session: any = null;

  const [customer, addresses, orders, cartItems] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
      },
    }),
    db.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      take: 20,
      select: {
        id: true,
        name: true,
        street: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        isDefault: true,
        createdAt: true,
      },
    }),
    db.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        discountAmount: true,
        createdAt: true,
        shippingAddress: true,
        payment: {
          select: {
            provider: true,
            status: true,
          },
        },
      },
    }),
    db.cartItem.findMany({
      where: { userId },
      select: {
        id: true,
        quantity: true,
        selectedSize: true,
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
            colorName: true,
          },
        },
      },
      take: 20,
    }),
  ]);

  if (sessionStore) {
    try {
      session = await sessionStore.findUnique({
        where: { userId },
        select: {
          step: true,
          status: true,
          cartValue: true,
          potentialRecovery: true,
          timeline: true,
          metadata: true,
          updatedAt: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (!isCheckoutSessionStoreMissingError(error)) {
        throw error;
      }
      session = null;
    }
  }

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  }

  const customerName = pickName(customer);
  const lifetimeSpend = Math.round(orders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0));
  const ordersCount = await db.order.count({ where: { userId } });

  const cartLineItems = cartItems.map((item) => {
    const unitPrice = Math.round(toNumber(item?.product?.price || 0));
    const quantity = Math.max(Number(item.quantity || 0), 0);
    return {
      id: item.id,
      productId: item.product?.id || '',
      image: item.product?.image || '',
      name: item.product?.name || 'Product',
      size: item.selectedSize || '-',
      color: item.product?.colorName || 'Default',
      quantity,
      price: unitPrice,
      subtotal: Math.round(unitPrice * quantity),
    };
  });

  const currentCartSubtotal = Math.round(cartLineItems.reduce((sum, item) => sum + item.subtotal, 0));

  return NextResponse.json(
    serializeDecimal({
      source: 'supabase-db',
      customer: {
        id: customer.id,
        name: customerName,
        email: customer.email,
        phone: customer.phone || '-',
        joinedDate: orders[orders.length - 1]?.createdAt || null,
        lifetimeSpend,
        ordersCount,
        savedAddresses: addresses.length,
      },
      currentCart: {
        items: cartLineItems,
        coupon: '-',
        shipping: 0,
        total: currentCartSubtotal,
      },
      checkoutSession: {
        step: session?.step || (currentCartSubtotal > 0 ? 'CART' : 'BROWSING'),
        status: session?.status || (currentCartSubtotal > 0 ? 'ACTIVE' : 'INACTIVE'),
        cartValue: Math.round(toNumber(session?.cartValue || currentCartSubtotal)),
        potentialRecovery: Math.round(toNumber(session?.potentialRecovery || 0)),
        timeline: Array.isArray(session?.timeline) ? session.timeline : [],
      },
      previousOrders: orders.map((order) => ({
        id: order.id,
        date: order.createdAt,
        amount: Math.round(toNumber(order.totalAmount)),
        status: order.status,
        paymentStatus: order.payment?.status || 'PENDING',
      })),
      addresses,
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
