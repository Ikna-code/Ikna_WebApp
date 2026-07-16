import { db } from '@/backend/lib/db';
import { emailService } from '@/backend/services/email';

function getCustomerName(user: { firstName?: string | null; lastName?: string | null }, email: string) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || email.split('@')[0] || 'Customer';
}

export async function sendOrderConfirmationForOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      orderItems: {
        select: {
          quantity: true,
          productName: true,
          selectedSize: true,
        },
      },
      payment: true,
    },
  });

  const email = String(order?.user?.email || '').trim();
  if (!order || !email) {
    return { success: false, skipped: true, reason: 'MISSING_ORDER_OR_EMAIL' };
  }

  const itemCount = (order.orderItems || []).reduce(
    (sum, item) => sum + Math.max(Number(item?.quantity) || 0, 0),
    0,
  );

  return emailService.sendOrderConfirmation(email, {
    id: order.id,
    total: Number(order.totalAmount || 0),
    paymentMethod: order.payment?.provider || 'UNKNOWN',
    paymentStatus: order.payment?.status || 'PENDING',
    itemCount,
    customerName: getCustomerName(order.user, email),
  });
}

export async function sendOrderPlacedNotification(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      orderItems: {
        select: {
          quantity: true,
        },
      },
      payment: true,
    },
  });

  const email = String(order?.user?.email || '').trim();
  if (!order || !email) {
    return { success: false, skipped: true, reason: 'MISSING_ORDER_OR_EMAIL' };
  }

  const itemCount = (order.orderItems || []).reduce(
    (sum, item) => sum + Math.max(Number(item?.quantity) || 0, 0),
    0,
  );

  const customerName = getCustomerName(order.user, email);

  await Promise.all([
    emailService.sendOrderPlaced(email, {
      id: order.id,
      total: Number(order.totalAmount || 0),
      paymentMethod: order.payment?.provider || 'UNKNOWN',
      itemCount,
      customerName,
    }),
    emailService.sendAdminOrderNotification(process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@iknaonline.com', {
      id: order.id,
      total: Number(order.totalAmount || 0),
      paymentMethod: order.payment?.provider || 'UNKNOWN',
      paymentStatus: order.payment?.status || 'PENDING',
      customerName,
      customerEmail: email,
    }),
  ]);

  return { success: true };
}

export async function sendOrderStatusUpdateForOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      payment: true,
    },
  });

  const email = String(order?.user?.email || '').trim();
  if (!order || !email) {
    return { success: false, skipped: true, reason: 'MISSING_ORDER_OR_EMAIL' };
  }

  const customerName = getCustomerName(order.user, email);

  return emailService.sendOrderStatusUpdate(email, {
    id: order.id,
    status: order.status,
    trackingUrl: order.trackingUrl,
    customerName,
  });
}
