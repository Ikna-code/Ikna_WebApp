import { NextResponse } from 'next/server';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { db } from '@/backend/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { restoreOrderInventory } from '@/backend/services/inventory';
import { sendOrderConfirmationForOrder } from '@/backend/services/orderNotifications';
import { runPostPaymentFulfillment } from '@/backend/services/postPaymentFulfillment';

const ALLOWED_STATUSES = new Set<OrderStatus>([
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
]);

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

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await getAuthorizedAdmin();
  if (auth.error) return auth.error;

  const { orderId } = await context.params;
  const body = await request.json().catch(() => null);
  const nextStatus = body?.status as OrderStatus | undefined;
  const nextPaymentStatus = body?.paymentStatus as PaymentStatus | undefined;

  if ((!nextStatus || !ALLOWED_STATUSES.has(nextStatus)) && nextPaymentStatus !== PaymentStatus.COMPLETED) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    let paymentWasAlreadyCompleted = false;

    const updatedOrder = await db.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });

      if (!existingOrder) {
        throw new Error('ORDER_NOT_FOUND');
      }

      paymentWasAlreadyCompleted = Boolean(
        existingOrder.paidAt || existingOrder.payment?.status === PaymentStatus.COMPLETED
      );

      if (nextStatus === OrderStatus.CANCELLED && existingOrder.status !== OrderStatus.CANCELLED) {
        await restoreOrderInventory(orderId, tx);
      }

      const shouldSetPaidAt =
        (nextStatus === OrderStatus.PAID || nextPaymentStatus === PaymentStatus.COMPLETED) &&
        !existingOrder.paidAt;

      const nextOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          ...(nextStatus ? { status: nextStatus } : {}),
          ...(shouldSetPaidAt ? { paidAt: new Date() } : {}),
        },
        include: {
          address: true,
          payment: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          orderItems: true,
        },
      });

      if (nextPaymentStatus === PaymentStatus.COMPLETED) {
        await tx.payment.upsert({
          where: { orderId: nextOrder.id },
          update: {
            status: PaymentStatus.COMPLETED,
            provider: existingOrder.payment?.provider || 'MANUAL_ADMIN',
            amount: nextOrder.totalAmount,
          },
          create: {
            orderId: nextOrder.id,
            amount: nextOrder.totalAmount,
            status: PaymentStatus.COMPLETED,
            provider: 'MANUAL_ADMIN',
          },
        });
      }

      return nextOrder;
    });

    if (nextStatus === OrderStatus.PAID || nextPaymentStatus === PaymentStatus.COMPLETED) {
      await db.payment.upsert({
        where: { orderId: updatedOrder.id },
        update: {
          status: PaymentStatus.COMPLETED,
          provider: updatedOrder.payment?.provider || 'MANUAL_ADMIN',
          amount: updatedOrder.totalAmount,
        },
        create: {
          orderId: updatedOrder.id,
          amount: updatedOrder.totalAmount,
          status: PaymentStatus.COMPLETED,
          provider: 'MANUAL_ADMIN',
        },
      });

      if (!paymentWasAlreadyCompleted) {
        await sendOrderConfirmationForOrder(updatedOrder.id);
      }

      try {
        await runPostPaymentFulfillment({
          orderId: updatedOrder.id,
          source: 'admin-manual-paid',
        });
      } catch (fulfillmentError) {
        console.error('[admin-orders] Post-payment fulfillment failed after marking paid.', {
          orderId: updatedOrder.id,
          paymentStatus: PaymentStatus.COMPLETED,
          error: fulfillmentError,
        });
      }
    }

    const refreshedOrder = await db.order.findUnique({
      where: { id: updatedOrder.id },
      include: {
        address: true,
        payment: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        orderItems: true,
      },
    });

    const relationAddress = refreshedOrder?.address
      ? [
          refreshedOrder.address.name,
          refreshedOrder.address.street,
          refreshedOrder.address.city,
          refreshedOrder.address.state,
          refreshedOrder.address.zip,
          refreshedOrder.address.country,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    return NextResponse.json({
      ...(refreshedOrder || updatedOrder),
      address: (refreshedOrder?.shippingAddress || updatedOrder.shippingAddress) || relationAddress || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.error('[admin-orders] Failed to update order status.', { orderId, error });
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
