import { NextResponse } from 'next/server';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { db } from '@/backend/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { restoreOrderInventory } from '@/backend/services/inventory';
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

  if (!nextStatus || !ALLOWED_STATUSES.has(nextStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    const updatedOrder = await db.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!existingOrder) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (nextStatus === OrderStatus.CANCELLED && existingOrder.status !== OrderStatus.CANCELLED) {
        await restoreOrderInventory(orderId, tx);
      }

      const shouldSetPaidAt = nextStatus === OrderStatus.PAID && !existingOrder.paidAt;

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
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
    });

    if (nextStatus === OrderStatus.PAID) {
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

    const relationAddress = updatedOrder.address
      ? [
          updatedOrder.address.name,
          updatedOrder.address.street,
          updatedOrder.address.city,
          updatedOrder.address.state,
          updatedOrder.address.zip,
          updatedOrder.address.country,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    return NextResponse.json({
      ...updatedOrder,
      address: updatedOrder.shippingAddress || relationAddress || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.error('[admin-orders] Failed to update order status.', { orderId, error });
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
