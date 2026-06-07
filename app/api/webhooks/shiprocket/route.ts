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

function matchesHmac(rawBody: string, signature: string, secret: string) {
  const hexDigest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const base64Digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const candidates = [hexDigest, base64Digest];

  return candidates.some((candidate) => {
    const expectedBuffer = Buffer.from(candidate);
    const actualBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  });
}

function mapShiprocketStatus(statusText: string | null) {
  if (!statusText) {
    return { orderStatus: null, packedAt: null, shippedAt: null, deliveredAt: null };
  }

  const normalized = statusText.toLowerCase();
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
  const rawBody = await request.text();
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
  const signature =
    request.headers.get('x-shiprocket-signature') ||
    request.headers.get('x-webhook-signature') ||
    request.headers.get('x-signature') ||
    request.headers.get('signature');

  if (secret) {
    if (!signature || !matchesHmac(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Invalid Shiprocket signature.' }, { status: 401 });
    }
  }

  let payload: JsonRecord;

  try {
    payload = JSON.parse(rawBody) as JsonRecord;
  } catch {
    return NextResponse.json({ error: 'Invalid Shiprocket payload.' }, { status: 400 });
  }

  const eventData = asJsonRecord(payload.shipment || payload.data || payload.order || payload);

  const dbOrderId = pickString(
    payload.dbOrderId,
    payload.db_order_id,
    eventData.dbOrderId,
    eventData.db_order_id,
    payload.reference_id,
    payload.referenceId,
    eventData.reference_id,
    eventData.referenceId,
    payload.channel_order_id,
    eventData.channel_order_id,
  );

  const shiprocketOrderId = pickString(
    payload.shiprocket_order_id,
    payload.sr_order_id,
    eventData.shiprocket_order_id,
    eventData.sr_order_id,
    eventData.order_id,
  );

  const shipmentId = pickString(
    payload.shipment_id,
    eventData.shipment_id,
    eventData.id,
  );

  const awbCode = pickString(payload.awb_code, payload.awb, eventData.awb_code, eventData.awb);
  const courierName = pickString(payload.courier_name, payload.courier, eventData.courier_name, eventData.courier);
  const trackingUrl = pickString(payload.tracking_url, eventData.tracking_url);
  const shiprocketStatus = pickString(
    payload.current_status,
    payload.shipment_status,
    payload.status,
    eventData.current_status,
    eventData.shipment_status,
    eventData.status,
  );

  const mappedStatus = mapShiprocketStatus(shiprocketStatus);
  const order = await syncOrderState({
    orderId: dbOrderId,
    shiprocketOrderId,
    shipmentId,
    orderStatus: mappedStatus.orderStatus,
    shipment: {
      shiprocketOrderId,
      shipmentId,
      awbCode,
      courierName,
      trackingUrl,
      shiprocketStatus,
      packedAt: mappedStatus.packedAt,
      shippedAt: mappedStatus.shippedAt,
      deliveredAt: mappedStatus.deliveredAt,
    },
  });

  return NextResponse.json({
    received: true,
    orderId: order?.id ?? null,
    shiprocketStatus,
  });
}