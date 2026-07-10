import { db } from '@/backend/lib/db';

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

type TimelineEvent = {
  event: string;
  step: CheckoutStep;
  status: CheckoutStatus;
  at: string;
  note?: string;
};

type CartSnapshotItem = {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type SessionPayload = {
  step?: CheckoutStep;
  status?: CheckoutStatus;
  note?: string;
  cartValue?: number;
  potentialRecovery?: number;
  cartSnapshot?: CartSnapshotItem[];
  metadata?: Record<string, unknown>;
};

const SESSION_TABLE = 'customerCheckoutSession';
const TIMELINE_LIMIT = 24;

function getSessionStore() {
  return (db as any)[SESSION_TABLE];
}

function toNumber(value: unknown) {
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

function clampCurrency(value: unknown) {
  const next = Math.round(Math.max(toNumber(value), 0));
  return Number.isFinite(next) ? next : 0;
}

function getTimeoutMinutes() {
  const fromEnv = Number(process.env.CHECKOUT_ABANDONED_TIMEOUT_MINUTES || 30);
  if (!Number.isFinite(fromEnv) || fromEnv <= 0) return 30;
  return Math.floor(fromEnv);
}

function addTimelineEvent(existing: unknown, nextEvent: TimelineEvent) {
  const events = Array.isArray(existing) ? [...existing] : [];
  events.unshift(nextEvent);
  return events.slice(0, TIMELINE_LIMIT);
}

export async function getCartSnapshotForUser(userId: string): Promise<{
  cartValue: number;
  items: CartSnapshotItem[];
}> {
  const cartRows = await db.cartItem.findMany({
    where: { userId: String(userId) },
    include: {
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
  });

  const items: CartSnapshotItem[] = cartRows.map((row) => {
    const price = clampCurrency(row?.product?.price ?? 0);
    const quantity = Math.max(Number(row?.quantity || 0), 0);
    return {
      id: String(row.id),
      productId: String(row.productId),
      productName: String(row?.product?.name || 'Product'),
      productImage: String(row?.product?.image || ''),
      color: String(row?.product?.colorName || 'Default'),
      size: String(row?.selectedSize || '-'),
      quantity,
      price,
      subtotal: Math.round(price * quantity),
    };
  });

  const cartValue = items.reduce((sum, item) => sum + item.subtotal, 0);
  return {
    cartValue,
    items,
  };
}

export async function markTimedOutCheckoutSessions() {
  const store = getSessionStore();
  if (!store) return;

  const timeoutMinutes = getTimeoutMinutes();
  const threshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  await store.updateMany({
    where: {
      status: {
        in: ['ACTIVE', 'PAYMENT_PENDING', 'PAYMENT_FAILED'],
      },
      lastActivityAt: {
        lt: threshold,
      },
    },
    data: {
      status: 'ABANDONED_CART',
      abandonedAt: new Date(),
      potentialRecovery: undefined,
    },
  });

  const abandonedRows = await store.findMany({
    where: {
      status: 'ABANDONED_CART',
      potentialRecovery: {
        lte: 0,
      },
      cartValue: {
        gt: 0,
      },
    },
    select: {
      id: true,
      cartValue: true,
    },
    take: 250,
  });

  await Promise.all(
    abandonedRows.map((row: any) =>
      store.update({
        where: { id: row.id },
        data: {
          potentialRecovery: clampCurrency(row.cartValue),
        },
      })
    )
  );
}

export async function upsertCustomerCheckoutSession(userId: string, payload: SessionPayload) {
  const store = getSessionStore();
  if (!store) return null;

  const now = new Date();
  const step = payload.step || 'BROWSING';
  const status = payload.status || 'ACTIVE';
  const cartValue = clampCurrency(payload.cartValue);
  const potentialRecovery = clampCurrency(payload.potentialRecovery ?? cartValue);
  const timelineEvent: TimelineEvent = {
    event: payload.note || step,
    step,
    status,
    at: now.toISOString(),
    note: payload.note,
  };

  const existing = await store.findUnique({
    where: { userId: String(userId) },
    select: {
      id: true,
      timeline: true,
      metadata: true,
    },
  });

  if (existing?.id) {
    return store.update({
      where: { userId: String(userId) },
      data: {
        step,
        status,
        cartValue,
        potentialRecovery: status === 'ABANDONED_CART' ? potentialRecovery : 0,
        lastActivityAt: now,
        abandonedAt: status === 'ABANDONED_CART' ? now : null,
        convertedAt: status === 'CONVERTED' ? now : null,
        cartSnapshot: payload.cartSnapshot ?? undefined,
        metadata: {
          ...(existing?.metadata || {}),
          ...(payload.metadata || {}),
        },
        timeline: addTimelineEvent(existing?.timeline, timelineEvent),
      },
    });
  }

  return store.create({
    data: {
      userId: String(userId),
      step,
      status,
      cartValue,
      potentialRecovery: status === 'ABANDONED_CART' ? potentialRecovery : 0,
      lastActivityAt: now,
      abandonedAt: status === 'ABANDONED_CART' ? now : null,
      convertedAt: status === 'CONVERTED' ? now : null,
      cartSnapshot: payload.cartSnapshot || [],
      metadata: payload.metadata || {},
      timeline: [timelineEvent],
    },
  });
}

export async function trackCartActivity(userId: string, note = 'Cart activity') {
  const snapshot = await getCartSnapshotForUser(userId);

  if (snapshot.cartValue <= 0) {
    return upsertCustomerCheckoutSession(userId, {
      step: 'BROWSING',
      status: 'INACTIVE',
      cartValue: 0,
      potentialRecovery: 0,
      cartSnapshot: [],
      note,
    });
  }

  return upsertCustomerCheckoutSession(userId, {
    step: 'CART',
    status: 'ACTIVE',
    cartValue: snapshot.cartValue,
    cartSnapshot: snapshot.items,
    note,
  });
}

export async function trackCheckoutStep(userId: string, step: CheckoutStep, note?: string) {
  const snapshot = await getCartSnapshotForUser(userId);
  return upsertCustomerCheckoutSession(userId, {
    step,
    status: 'ACTIVE',
    cartValue: snapshot.cartValue,
    cartSnapshot: snapshot.items,
    note: note || `Checkout step: ${step}`,
  });
}

export async function markPaymentPending(userId: string, orderId?: string | null) {
  const snapshot = await getCartSnapshotForUser(userId);
  return upsertCustomerCheckoutSession(userId, {
    step: 'PAYMENT_STARTED',
    status: 'PAYMENT_PENDING',
    cartValue: snapshot.cartValue,
    potentialRecovery: snapshot.cartValue,
    cartSnapshot: snapshot.items,
    note: 'Payment started',
    metadata: orderId ? { orderId } : undefined,
  });
}

export async function markPaymentFailed(userId: string, orderId?: string | null) {
  const snapshot = await getCartSnapshotForUser(userId);
  return upsertCustomerCheckoutSession(userId, {
    step: 'PAYMENT_STARTED',
    status: 'PAYMENT_FAILED',
    cartValue: snapshot.cartValue,
    potentialRecovery: snapshot.cartValue,
    cartSnapshot: snapshot.items,
    note: 'Payment failed',
    metadata: orderId ? { orderId } : undefined,
  });
}

export async function markCheckoutConverted(userId: string, orderId?: string | null) {
  return upsertCustomerCheckoutSession(userId, {
    step: 'ORDER_COMPLETED',
    status: 'CONVERTED',
    cartValue: 0,
    potentialRecovery: 0,
    cartSnapshot: [],
    note: 'Order completed',
    metadata: orderId ? { orderId } : undefined,
  });
}