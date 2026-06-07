import crypto from 'crypto';

import { OrderStatus, PaymentStatus } from '@prisma/client';
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

function asJsonRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? (value as JsonRecord) : {};
}

function getDbOrderId(orderEntity: JsonRecord, paymentEntity: JsonRecord) {
  const orderNotes = asJsonRecord(orderEntity.notes);
  const paymentNotes = asJsonRecord(paymentEntity.notes);

  const fromNotes = pickString(
    paymentNotes.dbOrderId,
    paymentNotes.db_order_id,
    orderNotes.dbOrderId,
    orderNotes.db_order_id,
  );

  if (fromNotes) return fromNotes;

  const receipt = pickString(orderEntity.receipt, paymentEntity.receipt);
  if (receipt?.startsWith('order_')) {
    return receipt.slice('order_'.length);
  }

  return null;
}

function signaturesMatch(rawBody: string, signature: string, secret: string) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'Razorpay webhook secret is not configured.' }, { status: 500 });
  }

  if (!signature || !signaturesMatch(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid Razorpay signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as JsonRecord;
  const event = pickString(payload.event) || 'unknown';
  const payloadRecord = asJsonRecord(payload.payload);
  const orderRecord = asJsonRecord(payloadRecord.order);
  const paymentRecord = asJsonRecord(payloadRecord.payment);
  const orderEntity = asJsonRecord(orderRecord.entity);
  const paymentEntity = asJsonRecord(paymentRecord.entity);
  const dbOrderId = getDbOrderId(orderEntity, paymentEntity);
  const razorpayOrderId = pickString(paymentEntity.order_id, orderEntity.id);
  const paymentId = pickString(paymentEntity.id);

  if (!dbOrderId && !razorpayOrderId) {
    return NextResponse.json({ received: true, ignored: true, reason: 'No order identifier in payload.' });
  }

  if (event === 'payment.captured' || event === 'payment.authorized' || event === 'order.paid') {
    const order = await syncOrderState({
      orderId: dbOrderId,
      razorpayOrderId,
      orderStatus: OrderStatus.PAID,
      clearCartOnPaid: true,
      payment: {
        provider: 'RAZORPAY',
        status: PaymentStatus.COMPLETED,
        transactionId: paymentId,
      },
    });

    return NextResponse.json({ received: true, event, orderId: order?.id ?? null });
  }

  if (event === 'payment.failed') {
    const order = await syncOrderState({
      orderId: dbOrderId,
      razorpayOrderId,
      payment: {
        provider: 'RAZORPAY',
        status: PaymentStatus.FAILED,
        transactionId: paymentId,
      },
    });

    return NextResponse.json({ received: true, event, orderId: order?.id ?? null });
  }

  if (event === 'refund.processed' || event === 'payment.refunded') {
    const order = await syncOrderState({
      orderId: dbOrderId,
      razorpayOrderId,
      payment: {
        provider: 'RAZORPAY',
        status: PaymentStatus.REFUNDED,
        transactionId: paymentId,
      },
    });

    return NextResponse.json({ received: true, event, orderId: order?.id ?? null });
  }

  return NextResponse.json({ received: true, ignored: true, event });
}