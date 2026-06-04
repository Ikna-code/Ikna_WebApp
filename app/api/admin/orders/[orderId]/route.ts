import { NextResponse } from 'next/server';
import { OrderStatus, Role } from '@prisma/client';
import { db } from '@/backend/lib/db';
import { createServerSupabaseClient } from '@/backend/lib/supabaseServer';

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
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: {
        address: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                category: true,
                price: true,
              },
            },
          },
        },
      },
    });

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
  } catch {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
}
