"use server";
import crypto from "crypto";
import { db } from "@/backend/lib/db";

export async function verifyPayment(
  orderId: string, 
  razorpayPaymentId: string, 
  razorpaySignature: string,
  dbOrderId: string
) {
  // 1. Generate the expected signature
  const body = orderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");

  // 2. Compare signatures
  const isAuthentic = expectedSignature === razorpaySignature;

  if (isAuthentic) {
    const updatedOrder = await db.order.update({
      where: { id: dbOrderId },
      data: { status: "PAID" },
      select: { id: true, userId: true, totalAmount: true },
    });

    await db.cartItem.deleteMany({
      where: { userId: updatedOrder.userId },
    });

    await db.payment.upsert({
      where: { orderId: dbOrderId },
      update: {
        amount: updatedOrder.totalAmount,
        status: "COMPLETED",
        provider: "RAZORPAY",
        transactionId: razorpayPaymentId,
      },
      create: {
        orderId: dbOrderId,
        amount: updatedOrder.totalAmount,
        status: "COMPLETED",
        provider: "RAZORPAY",
        transactionId: razorpayPaymentId,
      }
    });

    return { success: true };
  } else {
    return { success: false, message: "Invalid payment signature" };
  }
}