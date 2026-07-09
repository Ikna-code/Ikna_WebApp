import { db } from '@/backend/lib/db';
import { emailService } from '@/backend/services/email';

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
    customerName:
      [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ').trim() ||
      email.split('@')[0] ||
      'Customer',
  });
}
