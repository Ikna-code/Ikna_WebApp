import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

import { db } from '@/backend/lib/db';
import { restoreOrderInventory } from '@/backend/services/inventory';

type SyncOrderInput = {
  orderId?: string | null;
  razorpayOrderId?: string | null;
  shiprocketOrderId?: string | null;
  shipmentId?: string | null;
  awbCode?: string | null;
  orderStatus?: OrderStatus | null;
  clearCartOnPaid?: boolean;
  payment?: {
    provider: string;
    status: PaymentStatus;
    transactionId?: string | null;
    amount?: number | string | null;
  } | null;
  shipment?: {
    shiprocketOrderId?: string | null;
    shipmentId?: string | null;
    awbCode?: string | null;
    courierName?: string | null;
    trackingUrl?: string | null;
    shiprocketStatus?: string | null;
    packedAt?: Date | null;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
  } | null;
};

const STATUS_RANK: Record<OrderStatus, number> = {
  PENDING: 0,
  PAID: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: 4,
};

function coerceString(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function pickHigherStatus(currentStatus: OrderStatus, nextStatus?: OrderStatus | null) {
  if (!nextStatus) return currentStatus;

  if (nextStatus === OrderStatus.CANCELLED) {
    if (currentStatus === OrderStatus.DELIVERED) return currentStatus;
    return nextStatus;
  }

  if (currentStatus === OrderStatus.CANCELLED && nextStatus !== OrderStatus.DELIVERED) {
    return currentStatus;
  }

  return STATUS_RANK[nextStatus] >= STATUS_RANK[currentStatus] ? nextStatus : currentStatus;
}

export async function syncOrderState(input: SyncOrderInput) {
  const normalizedAwbCode = coerceString(input.shipment?.awbCode ?? input.awbCode);
  const orderLookupFilters: Prisma.OrderWhereInput[] = [];

  if (input.orderId) orderLookupFilters.push({ id: input.orderId });
  if (input.razorpayOrderId) orderLookupFilters.push({ razorpayOrderId: input.razorpayOrderId });
  if (input.shiprocketOrderId) orderLookupFilters.push({ shiprocketOrderId: input.shiprocketOrderId });
  if (input.shipmentId) orderLookupFilters.push({ shipmentId: input.shipmentId });
  if (normalizedAwbCode) orderLookupFilters.push({ awbCode: normalizedAwbCode });

  if (!orderLookupFilters.length) {
    return null;
  }

  const order = await db.order.findFirst({
    where: {
      OR: orderLookupFilters,
    },
    include: {
      payment: true,
    },
  });

  if (!order) {
    return null;
  }

  const now = new Date();
  const nextOrderStatus = pickHigherStatus(order.status, input.orderStatus ?? undefined);
  const shouldMarkPaid = input.payment?.status === PaymentStatus.COMPLETED;
  const shouldRestoreInventory = nextOrderStatus === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED;

  const updatedOrder = await db.$transaction(async (tx) => {
    const orderUpdateData: Record<string, unknown> = {
      status: shouldMarkPaid ? pickHigherStatus(nextOrderStatus, OrderStatus.PAID) : nextOrderStatus,
    };

    const razorpayOrderId = coerceString(input.razorpayOrderId);
    const shiprocketOrderId = coerceString(input.shipment?.shiprocketOrderId ?? input.shiprocketOrderId);
    const shipmentId = coerceString(input.shipment?.shipmentId ?? input.shipmentId);
    const awbCode = normalizedAwbCode;
    const courierName = coerceString(input.shipment?.courierName);
    const trackingUrl = coerceString(input.shipment?.trackingUrl);
    const shiprocketStatus = coerceString(input.shipment?.shiprocketStatus);

    if (razorpayOrderId) orderUpdateData.razorpayOrderId = razorpayOrderId;
    if (shiprocketOrderId) orderUpdateData.shiprocketOrderId = shiprocketOrderId;
    if (shipmentId) orderUpdateData.shipmentId = shipmentId;
    if (awbCode) orderUpdateData.awbCode = awbCode;
    if (courierName) orderUpdateData.courierName = courierName;
    if (trackingUrl) orderUpdateData.trackingUrl = trackingUrl;
    if (shiprocketStatus) orderUpdateData.shiprocketStatus = shiprocketStatus;

    if (shouldMarkPaid && !order.paidAt) {
      orderUpdateData.paidAt = now;
    }

    if (input.shipment?.packedAt && !order.packedAt) {
      orderUpdateData.packedAt = input.shipment.packedAt;
    }

    if (input.shipment?.shippedAt && !order.shippedAt) {
      orderUpdateData.shippedAt = input.shipment.shippedAt;
    }

    if (input.shipment?.deliveredAt && !order.deliveredAt) {
      orderUpdateData.deliveredAt = input.shipment.deliveredAt;
    }

    if (shouldRestoreInventory) {
      await restoreOrderInventory(order.id, tx);
    }

    const next = await tx.order.update({
      where: { id: order.id },
      data: orderUpdateData,
      include: { payment: true },
    });

    if (input.payment) {
      const amount = input.payment.amount ?? Number(order.totalAmount);
      await tx.payment.upsert({
        where: { orderId: order.id },
        update: {
          provider: input.payment.provider,
          status: input.payment.status,
          amount,
          transactionId: coerceString(input.payment.transactionId) ?? undefined,
        },
        create: {
          orderId: order.id,
          provider: input.payment.provider,
          status: input.payment.status,
          amount,
          transactionId: coerceString(input.payment.transactionId),
        },
      });
    }

    if (input.clearCartOnPaid && shouldMarkPaid) {
      await tx.cartItem.deleteMany({
        where: { userId: order.userId },
      });
    }

    return next;
  });

  return updatedOrder;
}