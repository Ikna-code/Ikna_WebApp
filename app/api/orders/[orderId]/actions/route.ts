import { OrderStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import { db } from '@/backend/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type OrderAction = 'return';

function normalizeAction(value: unknown): OrderAction | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'return') {
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
    return NextResponse.json({ error: 'Invalid action. Only return requests are supported.' }, { status: 400 });
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
