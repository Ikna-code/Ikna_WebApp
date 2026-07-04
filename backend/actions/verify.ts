"use server";
import crypto from "crypto";
import { OrderStatus, PaymentStatus } from '@prisma/client';

import { syncOrderState } from '@/backend/lib/orderSync';
import { runPostPaymentFulfillment } from '@/backend/services/postPaymentFulfillment';

export async function verifyPayment(
  orderId: string, 
  razorpayPaymentId: string, 
  razorpaySignature: string,
  dbOrderId: string
) {
  console.info('===== Razorpay Payment =====');
  console.info('payment id', razorpayPaymentId);
  console.info('order id', orderId);
  console.info('signature', razorpaySignature);

  // 1. Generate the expected signature
  const body = orderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");

  // 2. Compare signatures
  const isAuthentic = expectedSignature === razorpaySignature;

  if (isAuthentic) {
    const updatedOrder = await syncOrderState({
      orderId: dbOrderId,
      razorpayOrderId: orderId,
      orderStatus: OrderStatus.PAID,
      clearCartOnPaid: true,
      payment: {
        provider: 'RAZORPAY',
        status: PaymentStatus.COMPLETED,
        transactionId: razorpayPaymentId,
      },
    });

    if (updatedOrder?.id) {
      try {
        const shiprocketResult = await runPostPaymentFulfillment({
          orderId: updatedOrder.id,
          source: 'razorpay-verify',
        });

        return { success: true, shiprocketSuccess: Boolean(shiprocketResult?.created), shiprocketResult };
      } catch (fulfillmentError) {
        const message = fulfillmentError instanceof Error ? fulfillmentError.message : String(fulfillmentError);

        console.error('[verify-payment] Post-payment fulfillment failed.', {
          orderId: updatedOrder.id,
          paymentStatus: PaymentStatus.COMPLETED,
          error: message,
          rawError: fulfillmentError,
        });

        return {
          success: true,
          shiprocketSuccess: false,
          shiprocketError: message,
        };
      }
    }

    return { success: true };
  } else {
    return { success: false, message: "Invalid payment signature" };
  }
}