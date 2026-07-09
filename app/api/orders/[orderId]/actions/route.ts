import { OrderStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import { db } from '@/backend/lib/db';
import { restoreOrderInventory } from '@/backend/services/inventory';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type OrderAction = 'cancel' | 'return';

function normalizeAction(value: unknown): OrderAction | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cancel' || normalized === 'return') {
    return normalized;
  }
  return null;
}

function isReturnRequestedStatus(value: unknown) {
  return String(value || '').trim().toUpperCase().includes('RETURN_REQUESTED');
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await context.params;
  const body = await request.json().catch(() => null);
  const action = normalizeAction(body?.action);

  if (!action) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
    include: {
      payment: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (action === 'cancel') {
    if (order.status === OrderStatus.CANCELLED) {
      return NextResponse.json({ success: true, message: 'Order already cancelled.' });
    }

    if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) {
      return NextResponse.json(
        { error: 'Order can only be cancelled before shipment.' },
        { status: 400 },
      );
    }

    await db.$transaction(async (tx) => {
      await restoreOrderInventory(order.id, tx);

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          shiprocketStatus: 'CANCELLED_BY_CUSTOMER',
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully.',
    });
  }

  if (order.status !== OrderStatus.DELIVERED) {
    return NextResponse.json(
      { error: 'Return can only be requested for delivered orders.' },
      { status: 400 },
    );
  }

  if (isReturnRequestedStatus(order.shiprocketStatus)) {
    return NextResponse.json({ success: true, message: 'Return already requested.' });
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      shiprocketStatus: 'RETURN_REQUESTED',
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Return request submitted successfully.',
  });
}
