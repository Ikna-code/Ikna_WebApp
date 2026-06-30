import crypto from 'crypto';

import { OrderStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import { syncOrderState } from '@/backend/lib/orderSync';

type JsonRecord = Record<string, unknown>;

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function equalsSecret(expected: string, provided: string) {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function mapStatus(currentStatus: string | null) {
  if (!currentStatus) {
    return { orderStatus: null, packedAt: null, shippedAt: null, deliveredAt: null };
  }

  const normalized = currentStatus.toLowerCase();
  const now = new Date();

  if (normalized.includes('deliver')) {
    return { orderStatus: OrderStatus.DELIVERED, packedAt: null, shippedAt: null, deliveredAt: now };
  }

  if (
    normalized.includes('shipped') ||
    normalized.includes('dispatch') ||
    normalized.includes('in transit') ||
    normalized.includes('out for delivery')
  ) {
    return { orderStatus: OrderStatus.SHIPPED, packedAt: null, shippedAt: now, deliveredAt: null };
  }

  if (
    normalized.includes('packed') ||
    normalized.includes('manifest') ||
    normalized.includes('pickup') ||
    normalized.includes('ready to ship')
  ) {
    return { orderStatus: OrderStatus.PAID, packedAt: now, shippedAt: null, deliveredAt: null };
  }

  if (normalized.includes('cancel') || normalized.includes('rto') || normalized.includes('return')) {
    return { orderStatus: OrderStatus.CANCELLED, packedAt: null, shippedAt: null, deliveredAt: null };
  }

  return { orderStatus: null, packedAt: null, shippedAt: null, deliveredAt: null };
}

function asJsonRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? (value as JsonRecord) : {};
}

export async function POST(request: Request) {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET?.trim();
  const apiKey = request.headers.get('x-api-key')?.trim();

  if (!secret) {
    return NextResponse.json({ error: 'SHIPROCKET_WEBHOOK_SECRET is not configured.' }, { status: 500 });
  }

  if (!apiKey || !equalsSecret(secret, apiKey)) {
    return NextResponse.json({ error: 'Invalid x-api-key.' }, { status: 401 });
  }

  const rawBody = await request.text();

  let payload: JsonRecord;

  try {
    payload = JSON.parse(rawBody) as JsonRecord;
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  // Log full webhook payload during integration/testing.
  console.log('[order-status webhook] incoming payload:', payload);

  const eventData = asJsonRecord(payload.shipment || payload.data || payload.order || payload);
  const awbCode = pickString(payload.awb_code, payload.awb, eventData.awb_code, eventData.awb);
  const shiprocketOrderId = pickString(
    payload.order_id,
    payload.shiprocket_order_id,
    payload.sr_order_id,
    eventData.order_id,
    eventData.shiprocket_order_id,
    eventData.sr_order_id,
  );
  const shipmentId = pickString(payload.shipment_id, eventData.shipment_id, eventData.id);
  const currentStatus = pickString(
    payload.current_status,
    payload.shipment_status,
    payload.status,
    eventData.current_status,
    eventData.shipment_status,
    eventData.status,
  );

  const mappedStatus = mapStatus(currentStatus);

  const order = await syncOrderState({
    shiprocketOrderId,
    shipmentId,
    shipment: {
      shiprocketOrderId,
      shipmentId,
      awbCode,
      shiprocketStatus: currentStatus,
      packedAt: mappedStatus.packedAt,
      shippedAt: mappedStatus.shippedAt,
      deliveredAt: mappedStatus.deliveredAt,
    },
    orderStatus: mappedStatus.orderStatus,
  });

  return NextResponse.json({
    received: true,
    orderId: order?.id ?? null,
    awbCode,
    orderRef: shiprocketOrderId,
    currentStatus,
  });
}